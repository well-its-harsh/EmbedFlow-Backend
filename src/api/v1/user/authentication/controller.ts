import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";
import bcrypt from "bcrypt";
import { generateAccessToken } from "@/utils/auth/jwt.utils";

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      status: "error",
      error: "Username, email, and password are required",
    });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "error",
        error:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    const token = generateAccessToken(payload);

    return res.status(201).json({
      status: "success",
      message: "User created successfully",
      token: token,
    });
  } catch (error) {
    next(error);
  }
};

export const signIn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      error: "Email and password are required",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        error: "Invalid credentials",
      });
    }

    if (await bcrypt.compare(password, user.password)) {
      const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
      };
      return res.status(200).json({
        status: "success",
        message: "Login successful",
        token: generateAccessToken(payload),
      });
    } else {
      return res.status(401).json({
        status: "error",
        error: "Invalid credentials",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const signOut = async (
  _: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
