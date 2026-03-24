import prisma from "../database/prisma";
import { AppError } from "@/utils/debug/AppError";
import { Model, ModelType, Project } from "prisma/generated/prisma";

export interface CreateModelParams {
  modelName: string;
  modelType: ModelType;
  description?: string;
}

export interface UpdateProjectModelsParams {
  projectId: string;
  userId: string;
  retrievalModelId?: string;
  generatorModelId?: string;
}

export class ModelService {
  public async createModel(
    userId: string,
    data: CreateModelParams
  ): Promise<Model> {
    const existingModel = await prisma.model.findFirst({
      where: { userId, modelName: data.modelName },
    });

    if (existingModel) {
      return existingModel;
    }

    return prisma.model.create({
      data: {
        userId,
        modelName: data.modelName,
        modelType: data.modelType,
        description: data.description,
      },
    });
  }

  public async getModels(userId: string): Promise<Model[]> {
    return prisma.model.findMany({
      where: { userId, isActive: true },
      orderBy: { modelName: "asc" },
    });
  }

  public async getModelById(id: string): Promise<Model | null> {
    return prisma.model.findUnique({ where: { id, isActive: true } });
  }

  public async deleteModel(userId: string, modelId: string): Promise<Model> {
    const usedByProject = await prisma.project.findFirst({
      where: {
        userId: userId,
        OR: [{ retrievalModelId: modelId }, { generatorModelId: modelId }],
      },
    });

    if (usedByProject) {
      throw new AppError(
        `Model is currently assigned to project "${usedByProject.name}". Please reassign the project models before deleting.`
      );
    }

    return prisma.model.update({
      where: { id: modelId, userId: userId },
      data: { isActive: false },
    });
  }

  public async updateProjectModels({
    projectId,
    userId,
    retrievalModelId,
    generatorModelId,
  }: UpdateProjectModelsParams): Promise<Project> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: userId },
    });

    if (!project) {
      throw new AppError("Project not found or access denied.");
    }

    const modelsToVerify = [];
    if (retrievalModelId) modelsToVerify.push(retrievalModelId);
    if (generatorModelId) modelsToVerify.push(generatorModelId);

    if (modelsToVerify.length > 0) {
      const models = await prisma.model.findMany({
        where: {
          id: { in: modelsToVerify },
          userId: userId,
          isActive: true,
        },
      });

      if (models.length !== modelsToVerify.length) {
        throw new AppError(
          "One or more specified models were not found or are inactive."
        );
      }

      if (
        retrievalModelId &&
        models.find((m) => m.id === retrievalModelId)?.modelType !== "RETRIEVAL"
      ) {
        throw new AppError(
          "The selected Retrieval Model is not of type RETRIEVAL."
        );
      }
      if (
        generatorModelId &&
        models.find((m) => m.id === generatorModelId)?.modelType !== "GENERATOR"
      ) {
        throw new AppError(
          "The selected Generator Model is not of type GENERATOR."
        );
      }
    }

    const updateData: { retrievalModelId?: string; generatorModelId?: string } =
      {};
    if (retrievalModelId) updateData.retrievalModelId = retrievalModelId;
    if (generatorModelId) updateData.generatorModelId = generatorModelId;

    if (Object.keys(updateData).length === 0) {
      throw new AppError(
        "At least one model ID (retrievalModelId or generatorModelId) is required for update."
      );
    }

    return prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });
  }
}

export const modelService = new ModelService();
