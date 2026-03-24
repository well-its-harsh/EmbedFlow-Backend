import prisma from "../database/prisma";
import { AppError } from "../utils/debug/AppError";
import { QueryLog } from "prisma/generated/prisma";

export interface LogFilter {
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class LogService {
  public readonly MAX_LIMIT = 50;
  public readonly DEFAULT_LIMIT = 20;

  public async getQueryLogs(
    userId: string,
    filters: LogFilter
  ): Promise<{ logs: QueryLog[]; total: number }> {
    const limit = Math.min(filters.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const offset = filters.offset || 0;

    const where: any = {
      project: {
        userId: userId,
      },
    };

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.startDate || filters.endDate) {
      where.requestTimestamp = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const [logs, total] = await prisma.$transaction([
      prisma.queryLog.findMany({
        where: where,
        take: limit,
        skip: offset,
        orderBy: { requestTimestamp: "desc" },
      }),
      prisma.queryLog.count({ where: where }),
    ]);

    return { logs, total };
  }
}

export const logService = new LogService();
