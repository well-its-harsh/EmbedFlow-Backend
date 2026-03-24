import { Request, Response, NextFunction } from "express";
import logger from "@/utils/debug/logger";
import { AppError } from "@/utils/debug/AppError";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let customError = err;

  if (!(err instanceof AppError)) {
    customError = new AppError(
      err.message || "Internal Server Error",
      err.statusCode || 500,
      false
    );
  }

  logger.error(
    `Error on ${req.method} ${req.originalUrl} - ${customError.message}`,
    { stack: customError.stack }
  );

  res.status(customError.statusCode).json({
    success: false,
    message: customError.message,
  });
};
