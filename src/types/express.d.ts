import { Project } from "prisma/generated/prisma";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
    }
    interface Request {
      user?: User;

      project?: Project;

      apiKeyId?: string;
    }
  }
}

export {};
