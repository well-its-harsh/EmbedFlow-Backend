import { Client } from "minio";
import * as dotenv from "dotenv";
import logger from "@/utils/debug/logger";

dotenv.config();

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT!, 10),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});
minioClient;
logger.info("MinIO client initialized!");

export default minioClient;
