import prisma from "../database/prisma";
import { AppError } from "@/utils/debug/AppError";
import * as crypto from "crypto";
import { Project } from "prisma/generated/prisma";

export interface AuthProjectContext {
  apiKeyId: string;
  project: Project;
}

export class ApiKeyService {
  public async validateAndGetProject(
    fullApiKey: string
  ): Promise<AuthProjectContext> {
    if (!fullApiKey || fullApiKey.indexOf("_") === -1) {
      throw new AppError("Invalid API Key format.");
    }

    const [keyPrefix, keySecret] = fullApiKey.split("_");

    const keyHash = crypto.createHash("sha256").update(keySecret).digest("hex");

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyPrefix: `${keyPrefix}_`,
        keyHash: keyHash,
        isActive: true,
      },
      include: {
        project: true,
      },
    });

    if (!apiKeyRecord) {
      throw new AppError("API Key not found or inactive.");
    }

    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        console.error("Failed to update ApiKey lastUsedAt:", error);
      });

    return {
      apiKeyId: apiKeyRecord.id,
      project: apiKeyRecord.project,
    };
  }
}

export const apiKeyService = new ApiKeyService();
