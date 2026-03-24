import * as crypto from "crypto";

export interface GeneratedApiKey {
  fullKey: string;
  keyPrefix: string;
  keyHash: string;
}

export const API_KEY_PREFIX = "emb_";

export class ApiKeyGenerator {
  public generateNewKey(): GeneratedApiKey {
    const keySecret = crypto.randomBytes(16).toString("hex");
    const keyPrefix = API_KEY_PREFIX;
    const fullKey = `${keyPrefix}${keySecret}`;

    const keyHash = crypto.createHash("sha256").update(keySecret).digest("hex");

    return {
      fullKey,
      keyPrefix,
      keyHash,
    };
  }
}

export const apiKeyGenerator = new ApiKeyGenerator();
