import { Request, Response, NextFunction, RequestHandler } from "express";
import { logService, LogFilter } from "@/services/logs.service";
import { AppError } from "@/utils/debug/AppError";
interface UserContext {
  id: string;
  username: string;
  email: string;
}

interface LogsQuery {
  projectId?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  offset?: string;

  [key: string]: any;
}

interface LogRequest extends Request {
  user?: UserContext;
  query: LogsQuery;
}

export const listQueryLogs: RequestHandler = async (
  req: LogRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError("Unauthorized: User context missing."));
  }

  const userId = req.user.id;
  const { projectId, startDate, endDate, limit, offset } = req.query;

  const filters: LogFilter = {};

  if (projectId) filters.projectId = projectId;

  if (limit) filters.limit = parseInt(limit, 10);
  if (offset) filters.offset = parseInt(offset, 10);

  if (startDate) {
    const date = new Date(startDate);
    if (isNaN(date.getTime()))
      return next(new AppError("Invalid startDate format."));
    filters.startDate = date;
  }

  if (endDate) {
    const date = new Date(endDate);
    if (isNaN(date.getTime()))
      return next(new AppError("Invalid endDate format."));
    filters.endDate = date;
  }

  try {
    const { logs, total } = await logService.getQueryLogs(userId, filters);

    res.status(200).json({
      metadata: {
        total,
        limit: filters.limit || logService.DEFAULT_LIMIT,
        offset: filters.offset || 0,
      },
      logs: logs,
    });
  } catch (error) {
    next(error);
  }
};
