import {
  openaiEmbeddingClient,
  optimizedOpenAIEmbeddingConfig,
} from "@/config/openAiConfig";

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiEmbeddingClient.embeddings.create({
    model: optimizedOpenAIEmbeddingConfig.model,
    input: text,
    dimensions: optimizedOpenAIEmbeddingConfig.dimensions,
  });
  return response.data[0].embedding;
}
