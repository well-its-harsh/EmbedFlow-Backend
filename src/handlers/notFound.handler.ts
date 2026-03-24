import { Request, Response, NextFunction } from "express";
import logger from "@/utils/debug/logger";

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.warn(`Not Found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Resource not found",
  });
};
