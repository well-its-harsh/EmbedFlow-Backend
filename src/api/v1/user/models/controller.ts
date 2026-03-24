import { Request, Response, NextFunction } from "express";
import { ModelType } from "prisma/generated/prisma";
import { modelService } from "@/services/model.service";
import { AppError } from "@/utils/debug/AppError";

interface UserContext {
  id: string;
  username: string;
  email: string;
}

interface ModelRequestBody {
  modelName: string;
  modelType: ModelType;
  description?: string;
}

interface ModelRequest extends Request {
  user?: UserContext;
  body: ModelRequestBody;
  params: { modelId: string };
}

export const createModel = async (
  req: ModelRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError("Unauthorized: User context missing."));
  }

  const userId = req.user.id;
  const { modelName, modelType, description } = req.body;

  if (!modelName || !modelType) {
    return next(new AppError("Model name and type are required."));
  }

  if (!Object.values(ModelType).includes(modelType)) {
    return next(
      new AppError(
        `Invalid model type. Must be one of: ${Object.values(ModelType).join(", ")}.`
      )
    );
  }

  try {
    const model = await modelService.createModel(userId, {
      modelName,
      modelType,
      description,
    });

    res.status(201).json({
      message: "Model created successfully.",
      model: model,
    });
  } catch (error) {
    next(error);
  }
};

export const getModelById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      message: "Invalid id or id for this user",
    });
  }

  try {
    const model = await modelService.getModelById(id);

    if (!model) {
      return res.status(404).json({
        status: "error",
        message: "No model with this user",
      });
    }

    res.status(200).json({
      message: "Model found",
      model: model,
    });
  } catch (error) {
    next(error);
  }
};

export const listModels = async (
  req: ModelRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError("Unauthorized: User context missing."));
  }

  const userId = req.user.id;

  try {
    const models = await modelService.getModels(userId);
    res.status(200).json(models);
  } catch (error) {
    next(error);
  }
};

export const deleteModel = async (
  req: ModelRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError("Unauthorized: User context missing."));
  }

  const userId = req.user.id;
  const { modelId } = req.params;

  try {
    const model = await modelService.deleteModel(userId, modelId);
    res.status(200).json({
      message: `Model '${model.modelName}' has been marked inactive/deleted.`,
      id: model.id,
    });
  } catch (error) {
    next(error);
  }
};
