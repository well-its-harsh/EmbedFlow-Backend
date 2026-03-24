import jwt from "jsonwebtoken";
import * as process from "node:process";

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_SECRET_TOKEN!, { expiresIn: "7d" });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET_TOKEN!);
};
