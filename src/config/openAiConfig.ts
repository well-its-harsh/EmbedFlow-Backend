import OpenAI from "openai";

export interface OpenAIEmbeddingConfig {
  model:
    | "text-embedding-3-large"
    | "text-embedding-3-small"
    | "text-embedding-ada-002";
  dimensions?: number;
  apiKey: string;
  batchSize?: number;
  baseURL?: string;
}

export const optimizedOpenAIEmbeddingConfig: OpenAIEmbeddingConfig = {
  model: "text-embedding-3-small",
  dimensions: 512,
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: "https://api.openai.com/v1",
  batchSize: 2048,
};

export const openaiEmbeddingClient = new OpenAI({
  apiKey: optimizedOpenAIEmbeddingConfig.apiKey,
  baseURL: optimizedOpenAIEmbeddingConfig.baseURL,
});

export function getOpenAiClient(): OpenAI {
  return openaiEmbeddingClient;
}
