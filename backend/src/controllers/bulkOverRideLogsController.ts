import express from "express";
import prisma from "../prisma";
import { handleError, responseHandler } from "../utils/helper";

export const getBulkOverRideLogs = async (req: express.Request, res: express.Response) => {
    const { userId, ratePolicyId, actionType, startDate, endDate, limit = "10", offset = "0", sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const whereClause: any = {};

    if (userId) whereClause.userId = userId as string;
    if (ratePolicyId) whereClause.ratePolicyId = ratePolicyId as string;
    if (actionType) whereClause.actionType = actionType as string;
    if (startDate && endDate) {
        whereClause.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
    }

   try {
    const bulkLogs = await prisma.bulkOverRideLogs.findMany({
        where: whereClause,
        include: {
            user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              },
              ratePolicy: {
                select: {
                  id: true,
                  name: true,
                  description: true
                }
            }
        },
        orderBy: {
            [sortBy as string]: sortOrder as 'asc' | 'desc'
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
    });

    const totalCount = await prisma.bulkOverRideLogs.count({
        where: whereClause
    });

    responseHandler(res, 200, "success", { logs: bulkLogs, pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        pages: Math.ceil(totalCount / parseInt(limit as string))
    }})
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }

}
