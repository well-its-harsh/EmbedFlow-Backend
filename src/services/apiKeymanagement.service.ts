import prisma from "../database/prisma";
import { AppError } from "@/utils/debug/AppError";
import { ApiKey } from "prisma/generated/prisma";
import { apiKeyGenerator, GeneratedApiKey } from "@/utils/key/apiAccess";

export class ApiKeyManagementService {
  public async generateKey(
    userId: string,
    projectId: string
  ): Promise<GeneratedApiKey> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project || project.userId !== userId) {
      throw new AppError(
        "Access denied: Project not found or does not belong to user."
      );
    }

    const { fullKey, keyPrefix, keyHash } = apiKeyGenerator.generateNewKey();

    await prisma.apiKey.create({
      data: {
        userId: userId,
        projectId: projectId,
        keyHash: keyHash,
        keyPrefix: keyPrefix,
        isActive: true,
      },
    });

    return { fullKey, keyPrefix, keyHash };
  }

  public async getKeys(
    userId: string,
    projectId: string
  ): Promise<Partial<ApiKey>[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: userId,
        projectId: projectId,
      },
      select: {
        id: true,
        keyPrefix: true,
        projectId: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return apiKeys as Partial<ApiKey>[];
  }

  public async revokeKey(
    userId: string,
    keyId: string
  ): Promise<Partial<ApiKey>> {
    const revokedKey = await prisma.apiKey.update({
      where: {
        id: keyId,
        userId: userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return revokedKey as Partial<ApiKey>;
  }
}

export const apiKeyManagementService = new ApiKeyManagementService();
