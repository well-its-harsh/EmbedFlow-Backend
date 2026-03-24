import { Model } from "prisma/generated/prisma";
import { AppError } from "../debug/AppError";
import { getOpenAiClient } from "../../config/openAiConfig";

export class LLMApiUtility {
  public async generateEmbedding(
    modelConfig: Model,
    text: string
  ): Promise<number[]> {
    try {
      const client = getOpenAiClient();

      const response = await client.embeddings.create({
        model: modelConfig.modelName,
        input: text,
        dimensions: 512,
      });

      if (!response.data || response.data.length === 0) {
        throw new AppError("Embedding service returned no data.");
      }

      return response.data[0].embedding;
    } catch (error) {
      console.error("LLM Embedding failed:", error);
      throw new AppError(
        `Embedding generation failed for model ${modelConfig.modelName}.`
      );
    }
  }

  public async generateResponse(
    modelConfig: Model,
    prompt: string
  ): Promise<string> {
    try {
      const client = getOpenAiClient();

      const response = await client.chat.completions.create({
        model: modelConfig.modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const generatedText = response.choices[0]?.message?.content;

      if (!generatedText) {
        throw new AppError("Generator model returned an empty response.");
      }

      return generatedText;
    } catch (error) {
      console.error("LLM Generation failed:", error);
      throw new AppError(
        `Response generation failed for model ${modelConfig.modelName}.`
      );
    }
  }
}

export const llmApiUtility = new LLMApiUtility();
