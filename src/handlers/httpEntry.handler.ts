import { Request, Response, NextFunction } from "express";
import logger from "@/utils/debug/logger"; // adjust alias as per your project

export const httpEntry = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};
