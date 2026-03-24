import { Request, Response, NextFunction } from "express";
import { queryService } from "../../../services/query.service";
import { AppError } from "../../../utils/debug/AppError";

interface QueryRequestBody {
  query: string;
  systemPrompt: string | undefined;
}

export const handleUserQuery = async (
  req: Request<{}, {}, QueryRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { query, systemPrompt } = req.body;
  const project = req.project;

  const apiKeyId = (req as any).apiKeyId as string;

  if (!query || typeof query !== "string") {
    return next(new AppError("Query string is required."));
  }

  console.log(apiKeyId);

  if (!project || !apiKeyId) {
    return next(new AppError("Authentication context missing."));
  }

  try {
    const requestTimestamp = new Date();

    const config = await queryService.getRagConfiguration(project);

    const combinedQuery = queryService.combinePromptAndQuery(
      query,
      systemPrompt
    );

    const contextChunks = await queryService.retrieveContext(
      combinedQuery,
      config
    );

    const { generatedResponse, citations } =
      await queryService.generateResponse(query, contextChunks, config);

    queryService
      .logQuery(project.id, apiKeyId, query, generatedResponse, citations)
      .catch((error) => {
        console.error("Failed to log query:", error);
      });

    res.status(200).json({
      response: generatedResponse,
      citations: citations.map((c) => ({
        documentId: c.documentId,
        score: c.score.toFixed(4),
      })),
      timestamp: requestTimestamp.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
