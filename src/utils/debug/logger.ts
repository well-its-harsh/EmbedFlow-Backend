import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

const logsDirectory = path.join(__dirname, "../../../logs");
if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    verbose: "cyan",
    debug: "blue",
    silly: "gray",
  },
};

// Add color mapping to Winston
import * as winston from "winston";
winston.addColors(customLevels.colors);

// Console format
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// File format
const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  levels: customLevels.levels,
  level: "debug",
  format: fileFormat,
  transports: [
    new transports.Console({ format: consoleFormat }),

    new DailyRotateFile({
      dirname: logsDirectory,
      filename: "info-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "info",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),

    new DailyRotateFile({
      dirname: logsDirectory,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    }),

    new DailyRotateFile({
      dirname: logsDirectory,
      filename: "debug-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "debug",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "7d",
    }),
  ],

  exceptionHandlers: [
    new transports.File({
      filename: path.join(logsDirectory, "exceptions.log"),
    }),
  ],

  rejectionHandlers: [
    new transports.File({
      filename: path.join(logsDirectory, "rejections.log"),
    }),
  ],
});

export default logger;
