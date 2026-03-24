import { PrismaClient } from "prisma/generated/prisma";

const prisma = new PrismaClient();

export async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log("Postgres connected");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

export default prisma;
