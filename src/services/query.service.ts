import prisma from "../database/prisma";
import { AppError } from "../utils/debug/AppError";
import { Project, Model, QueryLog } from "prisma/generated/prisma";
import { llmApiUtility } from "../utils/llm/llmApi.util";
import { qdrantUtility, RetrievedChunk } from "../utils/vector-db/qdrant.util";

export interface RagConfig {
  vectorCollectionName: string;
  retrievalModel: Model;
  generatorModel: Model;
}

export interface FinalQueryResponse {
  generatedResponse: string;
  citations: { documentId: string; score: number }[];
}

export class QueryService {
  public async getRagConfiguration(project: Project): Promise<RagConfig> {
    const {
      id: projectId,
      retrievalModelId,
      generatorModelId,
      vectorDbCollectionName,
    } = project;

    if (!vectorDbCollectionName) {
      throw new AppError(
        `Project ${projectId} is missing a vector database collection name.`
      );
    }

    const models = await prisma.model.findMany({
      where: {
        id: {
          in: [retrievalModelId, generatorModelId],
        },
      },
    });

    const retrievalModel = models.find((m) => m.id === retrievalModelId);
    const generatorModel = models.find((m) => m.id === generatorModelId);

    if (!retrievalModel) {
      throw new AppError(
        `Retrieval model (ID: ${retrievalModelId}) not found for project ${projectId}.`
      );
    }

    if (!generatorModel) {
      throw new AppError(
        `Generator model (ID: ${generatorModelId}) not found for project ${projectId}.`
      );
    }

    if (
      retrievalModel.modelType !== "RETRIEVAL" ||
      generatorModel.modelType !== "GENERATOR"
    ) {
      throw new AppError(
        `Models assigned to project ${projectId} have incorrect types.`
      );
    }

    return {
      vectorCollectionName: vectorDbCollectionName,
      retrievalModel: retrievalModel,
      generatorModel: generatorModel,
    };
  }

  public combinePromptAndQuery(
    query: string,
    systemPrompt: string | undefined
  ): string {
    return `${systemPrompt}\n${query}`;
  }

  public async retrieveContext(
    userQuery: string,
    config: RagConfig
  ): Promise<RetrievedChunk[]> {
    const queryVector = await llmApiUtility.generateEmbedding(
      config.retrievalModel,
      userQuery
    );

    const contextChunks = await qdrantUtility.searchVectors(
      config.vectorCollectionName,
      queryVector
    );

    if (contextChunks.length === 0) {
      console.warn(
        `No context found for query in collection: ${config.vectorCollectionName}`
      );
    }

    return contextChunks;
  }

  private generateRagPrompt(
    userQuery: string,
    contextChunks: RetrievedChunk[]
  ): string {
    const systemInstruction = `You are an expert Question Answering system. Your task is to answer the user's question ONLY based on the provided context chunks. 
whenever the user want to summarize his provided documents extract all related related chunks to that particular document.If the information required to answer is not present in the context, you MUST state "I cannot answer this question based on the provided documents." 
For every piece of information you use, include the document ID (cited as [documentId]) at the end of the sentence or fact.`;

    const context = contextChunks
      .map(
        (chunk, index) =>
          `--- Document ID: ${chunk.documentId} (Score: ${chunk.score.toFixed(4)}) ---\n${chunk.chunkText}`
      )
      .join("\n\n");

    const finalPrompt = `${systemInstruction}\n\n
--- CONTEXT DOCUMENTS ---
${context}
--------------------------
User Query: ${userQuery}`;

    return finalPrompt;
  }

  public async generateResponse(
    userQuery: string,
    contextChunks: RetrievedChunk[],
    config: RagConfig
  ): Promise<FinalQueryResponse> {
    const prompt = this.generateRagPrompt(userQuery, contextChunks);

    const generatedResponse = await llmApiUtility.generateResponse(
      config.generatorModel,
      prompt
    );

    const citations = contextChunks.map((chunk) => ({
      documentId: chunk.documentId,
      score: chunk.score,
    }));

    return { generatedResponse, citations };
  }

  // Stage 2, Step 7: Query Logging
  public async logQuery(
    projectId: string,
    apiKeyId: string,
    userQuery: string,
    generatedResponse: string,
    citations: { documentId: string; score: number }[]
  ): Promise<QueryLog> {
    return prisma.queryLog.create({
      data: {
        projectId,
        apiKeyId,
        userQuery,
        generatedResponse,
        citations: citations as any,
        responseTimestamp: new Date(),
      },
    });
  }
}

export const queryService = new QueryService();
