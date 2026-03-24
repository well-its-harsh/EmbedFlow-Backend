import { Request, Response, NextFunction } from "express";
import { apiKeyManagementService } from "@/services/apiKeymanagement.service";
import { AppError } from "@/utils/debug/AppError";

interface KeyRequest extends Request {
  user: {
    id: string;
    username: string;
    email: string;
  };
  params: { projectId: string; keyId: string };
}

export const createKey = async (
  req: KeyRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user.id;
  const { projectId } = req.params;

  if (!projectId) {
    return next(new AppError("Project ID is required."));
  }

  try {
    const newKey = await apiKeyManagementService.generateKey(userId, projectId);

    res.status(201).json({
      message:
        "API Key created successfully. THIS IS THE ONLY TIME THE KEY WILL BE SHOWN.",
      key: newKey.fullKey,
      prefix: newKey.keyPrefix,
    });
  } catch (error) {
    next(error);
  }
};

export const listKeys = async (
  req: KeyRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user.id;
  const { projectId } = req.params;

  try {
    const keys = await apiKeyManagementService.getKeys(userId, projectId);

    const safeKeys = keys.map((key) => ({
      id: key.id,
      prefix: key.keyPrefix,
      projectId: key.projectId,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    }));

    res.status(200).json(safeKeys);
  } catch (error) {
    next(error);
  }
};

export const revokeKey = async (
  req: KeyRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user.id;
  const { keyId } = req.params;

  try {
    const revokedKey = await apiKeyManagementService.revokeKey(userId, keyId);

    res.status(200).json({
      message: `API Key with prefix ${revokedKey.keyPrefix} has been successfully revoked.`,
      id: revokedKey.id,
      isActive: revokedKey.isActive,
      revokedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
