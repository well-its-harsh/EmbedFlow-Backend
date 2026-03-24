import { createClient, RedisClientType } from "redis";
import { RedisOptions } from "bullmq";
import * as dotenv from "dotenv";
import logger from "@/utils/debug/logger";

dotenv.config();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const redisPassword = process.env.REDIS_PASSWORD;

export const redisConfig = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
};

export const bullMqConnection: RedisOptions = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null as any,
};

export const redisClient = createClient({
  url: `redis://${redisHost}:${redisPort}`,
  password: redisPassword,
});

export const connectRedis = async () => {
  logger.info("Connecting to Redis...");
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

redisClient.on("connect", () => {
  console.log("Successfully connected to Redis!");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});
