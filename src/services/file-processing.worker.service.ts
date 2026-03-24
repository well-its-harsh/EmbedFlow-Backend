import { Worker, Job } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { redisConfig, bullMqConnection } from "@/config/redisConfig";
import logger from "@/utils/debug/logger";
import {
  chunkDocumentWithAgentic,
  processPdfStream,
  type ChunkResult,
  type OpenAIConfig,
} from "@/utils/projects/documents/chunk_openAI";
import { generateEmbedding } from "@/utils/projects/documents/embedding";
import { getQdrantClient } from "@/config/qdrantConfig";
import {
  initializePipeline,
  startPipeline,
  stopPipeline,
  disconnectPipeline,
} from "@/services/minio-bullmq-pipeline.service";
import prisma from "@/database/prisma";
import { IngestionStatus } from "prisma/generated/prisma";
import { getObject, getObjectStream } from "@/utils/projects/documents/minio";

interface MinioEventPayload {
  eventName: string;
  bucketName: string;
  objectKey: string;
  objectSize?: number;
  contentType?: string;
  eventTime: string;
  userMetadata?: Record<string, any>;
  originalEvent?: any;
}

const PIPELINE_CONFIG = {
  minioListName: process.env.MINIO_EVENTS_LIST || "minio-events",
  queueName: process.env.BULLMQ_QUEUE_NAME || "file-processing",
  redisConfig: redisConfig,
};

const openAIConfig: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || "",
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
};

const qdrantClient = getQdrantClient();
const QUEUE_NAME = PIPELINE_CONFIG.queueName;
const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || "documents";

let worker: Worker<MinioEventPayload> | null = null;
let isPipelineRunning = false;

async function updateDocumentStatus(
  documentId: string,
  status: IngestionStatus,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        ingestionStatus: status,
        errorMessage: errorMessage ? errorMessage.substring(0, 255) : null, // Truncate error message
      },
    });
  } catch (e) {
    logger.error(
      `Failed to update DB status for document ${documentId} to ${status}:`,
      e
    );
  }
}

async function ensureCollection(vectorSize: number): Promise<void> {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      });
      logger.info(`Created Qdrant collection: ${COLLECTION_NAME}`);
    }
  } catch (error) {
    logger.error("Error ensuring collection exists:", error);
    throw error;
  }
}

async function processMinioEvent(
  job: Job<MinioEventPayload>
): Promise<{ status: string; processedObject: string }> {
  const { bucketName, objectKey, contentType, userMetadata } = job.data;

  //  const documentId = userMetadata?.['x-amz-meta-documentid'] || userMetadata?.documentid;

  //   if (!documentId) {
  //       logger.error(`Job ${job.id} skipped: documentId missing in metadata.`);
  //       return { status: 'skipped', processedObject: objectKey };
  //   }

  //   await updateDocumentStatus(documentId, 'PROCESSING');

  try {
    logger.info(`Processing: ${objectKey}`);

    // Fetch document
    let document: string;
    if (
      contentType === "application/json" ||
      contentType === "text/plain" ||
      contentType === "text/csv"
    ) {
      const buffer = await getObject(bucketName, objectKey);
      document = buffer.toString("utf-8");
    } else {
      const stream = await getObjectStream(bucketName, objectKey);
      document = await processPdfStream(stream);
    }

    // Chunk document using agentic approach
    const result: ChunkResult = await chunkDocumentWithAgentic(
      document,
      openAIConfig
    );

    if (result.chunks.length === 0) {
      logger.warn("No chunks created, skipping Qdrant storage");
      // await updateDocumentStatus(documentId, 'COMPLETED');
      return { status: "success", processedObject: objectKey };
    }

    logger.info(`Created ${result.chunks.length} chunks for ${objectKey}`);

    // Generate embeddings and prepare Qdrant points
    const points = await Promise.all(
      result.chunks.map(async (chunk, idx) => {
        const embedding = await generateEmbedding(chunk.content);

        return {
          id: uuidv4(),
          vector: embedding,
          payload: {
            text: chunk.content,
            // documentId: documentId,
            chunkId: chunk.id,
            topic: chunk.metadata.topic,
            summary: chunk.metadata.summary,
            propositions: chunk.metadata.propositions,
            bucketName,
            objectKey,
            chunkIndex: idx,
            timestamp: new Date().toISOString(),
            contentType,
          },
        };
      })
    );

    // Ensure collection exists
    await ensureCollection(points[0].vector.length);

    // Store in Qdrant
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });

    logger.info(`Stored ${points.length} chunks in Qdrant for: ${objectKey}`);
    // await updateDocumentStatus(documentId, 'COMPLETED');
    return { status: "success", processedObject: objectKey };
  } catch (error) {
    logger.error("Failed to process MinIO event:", {
      error: error instanceof Error ? error.message : error,
      jobId: job.id,
      objectKey,
    });
    throw error;
  }
}

function createWorker(): Worker<MinioEventPayload> {
  const worker = new Worker<MinioEventPayload>(QUEUE_NAME, processMinioEvent, {
    connection: bullMqConnection,
    concurrency: 3,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  worker.on("completed", (job: Job) => {
    logger.info(`Job ${job.id} completed`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  worker.on("error", (err: Error) => {
    logger.error("Worker error:", err.message);
  });

  return worker;
}

async function startPipelineWorker(): Promise<void> {
  if (isPipelineRunning) {
    logger.warn("Pipeline already running");
    return;
  }

  try {
    logger.info("Starting pipeline worker...");
    await initializePipeline(PIPELINE_CONFIG);
    startPipeline(PIPELINE_CONFIG.minioListName).catch((error) => {
      logger.error("Pipeline failed:", error);
    });
    isPipelineRunning = true;
    logger.info("Pipeline worker started");
  } catch (error) {
    logger.error("Pipeline worker failed to start:", error);
    throw error;
  }
}

async function stopPipelineWorker(): Promise<void> {
  try {
    if (isPipelineRunning) {
      logger.info("Stopping pipeline worker...");
      stopPipeline();
      await disconnectPipeline();
      isPipelineRunning = false;
      logger.info("Pipeline worker stopped");
    }
  } catch (error) {
    logger.error("Error stopping pipeline worker:", error);
    throw error;
  }
}

async function startJobProcessor(): Promise<void> {
  try {
    logger.info("Starting job processor...");
    worker = createWorker();
    logger.info(`Worker listening on queue: ${QUEUE_NAME}`);
  } catch (error) {
    logger.error("Failed to start job processor:", error);
    throw error;
  }
}

async function stopJobProcessor(): Promise<void> {
  try {
    if (worker) {
      logger.info("Stopping job processor...");
      await worker.close();
      worker = null;
      logger.info("Job processor stopped");
    }
  } catch (error) {
    logger.error("Error stopping job processor:", error);
    throw error;
  }
}

async function startWorker(): Promise<void> {
  try {
    logger.info("Starting MinIO-BullMQ bridge worker...");
    await startPipelineWorker();
    await startJobProcessor();
    logger.info("Bridge worker started successfully");
  } catch (error) {
    logger.error("Failed to start bridge worker:", error);
    process.exit(1);
  }
}

async function stopWorker(): Promise<void> {
  try {
    logger.info("Stopping bridge worker...");
    await stopJobProcessor();
    await stopPipelineWorker();
    logger.info("Bridge worker stopped");
    process.exit(0);
  } catch (error) {
    logger.error("Error stopping bridge worker:", error);
    process.exit(1);
  }
}

function setupGracefulShutdown(): void {
  process.on("SIGINT", () => stopWorker());
  process.on("SIGTERM", () => stopWorker());
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    stopWorker();
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", reason);
    stopWorker();
  });
}

if (require.main === module) {
  setupGracefulShutdown();
  startWorker();
}

export {
  startWorker,
  stopWorker,
  startPipelineWorker,
  stopPipelineWorker,
  startJobProcessor,
  stopJobProcessor,
};
