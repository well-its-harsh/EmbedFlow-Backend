import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";
import {
  generatePreSignedUrl,
  deleteObject,
  renameObject,
} from "@/utils/projects/documents/minio";
import logger from "@/utils/debug/logger";

const getFileTypeEnum = (
  mimetype: string
): "PDF" | "TXT" | "DOCX" | "MD" | "CSV" => {
  switch (mimetype) {
    case "application/pdf":
      return "PDF";
    case "text/plain":
      return "TXT";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "DOCX";
    case "text/markdown":
      return "MD";
    case "text/csv":
      return "CSV";
    default:
      throw new Error(`Unsupported file type: ${mimetype}`);
  }
};

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { docName, bucketName, mimetype } = req.body;

    const userId = req.user!.id;
    const projectId = req.params.projectId;
    const expTime = 5 * 60;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId,
      },
    });

    if (!project) {
      return res.status(404).json({
        message:
          "Project not found or you do not have permission to access it.",
      });
    }

    if (!docName || !bucketName || !mimetype) {
      return res.status(400).json({
        message: "Request must include docName, bucketName, and mimetype.",
      });
    }

    const newDocument = await prisma.document.create({
      data: {
        projectId: projectId,
        fileName: docName,
        fileType: getFileTypeEnum(mimetype),
        storagePath: `${bucketName}/${userId}/${projectId}`,
        uploadStatus: "PENDING",
        ingestionStatus: "PENDING",
      },
    });

    const objectName = `${userId}/${projectId}/${newDocument.id}-${docName}`;
    const presignedUrl = await generatePreSignedUrl(
      objectName,
      bucketName,
      expTime
    );

    return res.status(201).json({
      message: "Successfully generated presigned URL",
      presignedUrl: presignedUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.projectId;

    const documents = await prisma.document.findMany({
      where: {
        projectId: projectId,
        project: {
          userId: userId,
        },
      },
    });

    return res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

export const updateDocumentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { projectId, documentId } = req.params;
    const { status } = req.body;

    if (!status || !["COMPLETED", "FAILED"].includes(status)) {
      return res.status(400).json({
        message:
          "Request body must include a valid status: 'COMPLETED' or 'FAILED'.",
      });
    }

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: {
          id: documentId,
          projectId: projectId,
          project: {
            userId: userId,
          },
        },
      });

      if (!document) {
        return null;
      }

      return tx.document.update({
        where: { id: documentId },
        data: { uploadStatus: status },
      });
    });

    if (!updatedDocument) {
      return res.status(404).json({
        message:
          "Document not found or you do not have permission to modify it.",
      });
    }

    return res.status(200).json(updatedDocument);
  } catch (error) {
    next(error);
  }
};

export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { projectId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        projectId: projectId,
        project: {
          userId: userId,
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        message:
          "Document not found or you do not have permission to access it.",
      });
    }

    return res.status(200).json(document);
  } catch (error) {
    next(error);
  }
};

export const changeDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { projectId, documentId } = req.params;
    const { docName } = req.body;
    console.log(documentId);

    if (!docName) {
      return res
        .status(400)
        .json({ message: "Request body must include the new fileName." });
    }

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: {
          id: documentId,
          projectId: projectId,
          project: {
            userId: userId,
          },
        },
      });

      if (!document) {
        return null;
      }
      const bucketName = document.storagePath.split("/")[0];
      logger.debug(
        `DEBUG: Attempting to rename from path: [${document.storagePath}], filename: [${document.fileName}]`
      );
      await renameObject(
        bucketName,
        `${userId}/${projectId}/${document.id}-${document.fileName}`,
        `${userId}/${projectId}/${document.id}-${docName}`
      );

      return tx.document.update({
        where: { id: documentId },
        data: { fileName: docName },
      });
    });

    if (!updatedDocument) {
      return res.status(404).json({
        message:
          "Document not found or you do not have permission to modify it.",
      });
    }

    return res.status(200).json(updatedDocument);
  } catch (error) {
    next(error);
  }
};

export const delDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { projectId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        projectId: projectId,
        project: {
          userId: userId,
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        message:
          "Document not found or you do not have permission to delete it.",
      });
    }

    const objectName = `${userId}/${projectId}/${document.id}-${document.fileName}`;
    const bucketName = document.storagePath.split("/")[0];

    await deleteObject(bucketName, objectName);

    await prisma.document.delete({
      where: { id: documentId },
    });

    res.status(204).json({
      message: "document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
