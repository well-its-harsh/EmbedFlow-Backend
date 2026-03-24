import { createClient, RedisClientType } from "redis";
import { Queue } from "bullmq";

interface PipelineConfig {
  minioListName: string;
  queueName: string;
  redisConfig?: any;
}

let redisClient: RedisClientType;
let bullmqQueue: Queue;
let isRunning = false;

export async function initializePipeline(
  config: PipelineConfig
): Promise<void> {
  const {
    queueName = "file-processing",
    redisConfig = { host: "localhost", port: 6379 },
  } = config;

  redisClient = createClient(redisConfig);

  bullmqQueue = new Queue(queueName, {
    connection: redisConfig,
  });

  redisClient.on("error", (error: Error) => {
    console.error("Redis Client Error:", error);
  });

  redisClient.on("connect", () => {
    console.log("Pipeline Redis client connected");
  });

  await redisClient.connect();
  console.log("Pipeline service connected to Redis");
}

function transformEventToJob(minioEvent: any): any {
  console.log("Raw MinIO event:", JSON.stringify(minioEvent, null, 2));

  let record;

  if (Array.isArray(minioEvent) && minioEvent.length > 0) {
    const eventContainer = minioEvent[0];
    if (
      eventContainer.Event &&
      Array.isArray(eventContainer.Event) &&
      eventContainer.Event.length > 0
    ) {
      record = eventContainer.Event[0];
      return {
        eventName: record.eventName,
        bucketName: record.s3.bucket.name,
        objectKey: decodeURIComponent(record.s3.object.key),
        objectSize: record.s3.object.size,
        contentType: record.s3.object.contentType,
        eventTime: record.eventTime,
        userMetadata: record.s3.object.userMetadata,
        eTag: record.s3.object.eTag,
        sequencer: record.s3.object.sequencer,
        originalEvent: minioEvent,
      };
    }
  }

  if (
    minioEvent.Records &&
    Array.isArray(minioEvent.Records) &&
    minioEvent.Records.length > 0
  ) {
    record = minioEvent.Records[0];
    return {
      eventName: record.eventName,
      bucketName: record.s3.bucket.name,
      objectKey: decodeURIComponent(record.s3.object.key),
      objectSize: record.s3.object.size,
      contentType: record.s3.object.contentType,
      eventTime: record.eventTime,
      userMetadata: record.s3.object.userMetadata,
      eTag: record.s3.object.eTag,
      sequencer: record.s3.object.sequencer,
      originalEvent: minioEvent,
    };
  }

  if (minioEvent.Key && minioEvent.EventName) {
    return {
      eventName: minioEvent.EventName,
      bucketName: minioEvent.BucketName || "unknown",
      objectKey: decodeURIComponent(minioEvent.Key),
      objectSize: minioEvent.Size || 0,
      contentType: minioEvent.ContentType || "unknown",
      eventTime: minioEvent.EventTime || new Date().toISOString(),
      userMetadata: minioEvent.UserMetadata || {},
      originalEvent: minioEvent,
    };
  }

  if (minioEvent.s3) {
    return {
      eventName: minioEvent.eventName || "unknown",
      bucketName: minioEvent.s3.bucket?.name || "unknown",
      objectKey: decodeURIComponent(minioEvent.s3.object?.key || "unknown"),
      objectSize: minioEvent.s3.object?.size || 0,
      contentType: minioEvent.s3.object?.contentType || "unknown",
      eventTime: minioEvent.eventTime || new Date().toISOString(),
      userMetadata: minioEvent.s3.object?.userMetadata || {},
      originalEvent: minioEvent,
    };
  }

  console.error("Unrecognized MinIO event structure:", minioEvent);
  console.error("Available keys:", Object.keys(minioEvent));
  console.error("Is array:", Array.isArray(minioEvent));
  if (Array.isArray(minioEvent) && minioEvent.length > 0) {
    console.error("First element keys:", Object.keys(minioEvent[0]));
  }
  throw new Error(
    `Unsupported MinIO event format. Available keys: ${Object.keys(
      minioEvent
    ).join(", ")}`
  );
}

async function transferEventToQueue(
  eventData: string,
  minioListName: string
): Promise<void> {
  try {
    const event = JSON.parse(eventData);

    const jobData = transformEventToJob(event);

    await bullmqQueue.add("process-minio-event", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    console.log(
      `Event transferred to queue: ${jobData.objectKey || "unknown"}`
    );
  } catch (error) {
    console.error("Error transferring event to queue:", error);
    throw error;
  }
}

export async function startPipeline(minioListName: string): Promise<void> {
  if (isRunning) {
    console.log("Pipeline is already running");
    return;
  }

  isRunning = true;
  console.log(`Starting pipeline: ${minioListName} -> BullMQ queue`);

  while (isRunning) {
    try {
      const result = await redisClient.blPop(minioListName, 5);

      if (result && isRunning) {
        await transferEventToQueue(result.element, minioListName);
      }
    } catch (error) {
      if (isRunning) {
        console.error("Error in pipeline:", error);
        await sleep(1000);
      }
    }
  }

  console.log("Pipeline stopped");
}

export function stopPipeline(): void {
  console.log("Stopping pipeline...");
  isRunning = false;
}

export async function disconnectPipeline(): Promise<void> {
  try {
    isRunning = false;
    if (redisClient) {
      await redisClient.disconnect();
    }
    if (bullmqQueue) {
      await bullmqQueue.close();
    }
    console.log("Pipeline service disconnected");
  } catch (error) {
    console.error("Error disconnecting pipeline:", error);
    throw error;
  }
}

export async function getQueueStats(): Promise<any> {
  if (!bullmqQueue) {
    throw new Error("Pipeline not initialized");
  }

  return {
    waiting: await bullmqQueue.getWaiting(),
    active: await bullmqQueue.getActive(),
    completed: await bullmqQueue.getCompleted(),
    failed: await bullmqQueue.getFailed(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
