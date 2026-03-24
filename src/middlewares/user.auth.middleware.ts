import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/debug/AppError";
import { verifyToken } from "@/utils/auth/jwt.utils";

export const verifyUserToken = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Token not provided", 401));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(new AppError("Token not provided", 401));
  }

  try {
    const decoded = verifyToken(token);

    if (typeof decoded === "object") {
      req.user = {
        ...req.user,
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};
