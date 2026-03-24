import { AppError } from "../debug/AppError";
import { getQdrantClient } from "../../config/qdrantConfig";

export interface RetrievedChunk {
  chunkText: string;
  documentId: string;
  score: number;
}

export class QdrantUtility {
  private readonly K_VALUE = 50;

  public async searchVectors(
    collectionName: string,
    queryVector: number[],
    k: number = this.K_VALUE
  ): Promise<RetrievedChunk[]> {
    try {
      const client = getQdrantClient();

      const searchResult = await client.search(collectionName, {
        vector: queryVector,
        limit: k,
        with_payload: true,
      });

      const retrievedChunks: RetrievedChunk[] = searchResult.map((hit) => {
        const payload = hit.payload as { text: string; documentId: string };

        return {
          chunkText: payload.text,
          documentId: payload.documentId,
          score: hit.score,
        };
      });

      return retrievedChunks;
    } catch (error) {
      console.error("Qdrant search failed:", error);
      throw new AppError(
        `Vector search failed in collection ${collectionName}.`
      );
    }
  }
}

export const qdrantUtility = new QdrantUtility();
