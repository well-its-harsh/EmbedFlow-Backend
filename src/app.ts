import express, { Request, Response } from "express";
import { httpEntry } from "@/handlers/httpEntry.handler";
import { notFoundHandler } from "@/handlers/notFound.handler";
import { errorHandler } from "@/handlers/error.handler";
import api from "@/api/v1";
import prisma from "@/database/prisma";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(httpEntry);

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.get("/health", (_: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/v1", api);

//not found error
app.use(notFoundHandler);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
