import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  models: {
    primary: string;
    fallback: string;
    metadata: string;
    validation: string;
  };
  costOptimization: {
    maxRetries: number;
    useSmartRouting: boolean;
    budgetLimit?: number;
  };
}

export function initializeClient(config: OpenRouterConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || "https://openrouter.ai/api/v1",
  });
}
