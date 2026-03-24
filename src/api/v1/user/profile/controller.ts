import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";

export const getProfileById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.user!;
  if (!id) return res.status(404).json({ error: "Not Found" });

  try {
    const data = await prisma.user.findUnique({
      where: { id: id },
      select: {
        email: true,
        username: true,
        projects: true,
        apiKeys: true,
        model: true,
      },
    });

    if (!data) return res.status(404).json({ error: "Not Found" });

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};
