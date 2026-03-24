import { QdrantClient } from "@qdrant/js-client-rest";

export interface QdrantConfig {
  host: string;
  port: number;
  apiKey?: string;
  defaultCollectionName: string;
  vectorConfig: {
    size: number;
    distance: "Cosine" | "Dot" | "Euclid";
  };
}

export const localQdrantConfig: QdrantConfig = {
  host: "localhost",
  port: 6333,
  defaultCollectionName: "embedflow",
  vectorConfig: {
    size: 512,
    distance: "Cosine",
  },
};

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!client) {
    client = new QdrantClient({
      url: `http://${localQdrantConfig.host}:${localQdrantConfig.port}`,
    });
  }
  return client;
}
