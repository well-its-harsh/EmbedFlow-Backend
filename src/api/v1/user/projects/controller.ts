import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";
import { modelService } from "@/services/model.service";
import { AppError } from "@/utils/debug/AppError";
import logger from "@/utils/debug/logger";

interface ProjectRequest extends Request {
  user: { id: string; username: string; email: string };
  params: { projectId: string };
  body: any;
}

interface AssignModelRequestBody {
  retrievalModelId?: string;
  generatorModelId?: string;
}

type ProjectUpdate = {
  name?: string;
  description?: string;
  retrievalModelId?: string;
  generatorModelId?: string;
  vectorDbCollectionName?: string;
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    name,
    description,
    retrievalModelId,
    generatorModelId,
    vectorDbCollectionName,
  } = req.body;

  try {
    const project = await prisma.project.create({
      data: {
        userId: req.user!.id,
        name: name,
        description: description,
        retrievalModelId: retrievalModelId,
        generatorModelId: generatorModelId,
        systemPrompt: "",
        vectorDbCollectionName: vectorDbCollectionName,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Project created",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = await prisma.project.findMany({
      where: {
        userId: req.user!.id,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(404).json({
      status: "error",
      message: "project Id not provided",
    });
  }

  try {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request<{ projectId: string }, object, ProjectUpdate>,
  res: Response,
  next: NextFunction
) => {
  const { projectId } = req.params;
  const updates = req.body;

  if (!projectId) {
    return res.status(404).json({
      status: "error",
      message: "project Id not provided",
    });
  }

  try {
    const project = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: updates,
    });

    res.status(200).json({
      status: "success",
      message: "Project updated",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  const id = req.params.id;

  try {
    await prisma.project.delete({
      where: {
        id: id,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Project deleted",
    });
  } catch (error) {
    next(error);
  }
};

export const assignProjectModels = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  const { retrievalModelId, generatorModelId } =
    req.body as AssignModelRequestBody;

  if (!retrievalModelId && !generatorModelId) {
    return next(
      new AppError(
        "At least one model ID (retrievalModelId or generatorModelId) is required for update."
      )
    );
  }

  try {
    const updatedProject = await modelService.updateProjectModels({
      projectId,
      userId,
      retrievalModelId,
      generatorModelId,
    });

    res.status(200).json({
      message: "Project models updated successfully.",
      projectId: updatedProject.id,
      retrievalModelId: updatedProject.retrievalModelId,
      generatorModelId: updatedProject.generatorModelId,
    });
  } catch (error) {
    next(error);
  }
};
