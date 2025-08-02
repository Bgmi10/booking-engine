import { Request, Response } from 'express';
import prisma from '../prisma';
import { handleError, responseHandler } from '../utils/helper';

export const getRateDatePrices = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId } = req.params;
    const { startDate, endDate, roomId } = req.query;

    const whereClause: any = {
      ratePolicyId,
      isActive: true,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (roomId) {
      whereClause.roomId = roomId as string;
    }

    const rateDatePrices = await prisma.rateDatePrice.findMany({
      where: whereClause,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            price: true,
          }
        },
        ratePolicy: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { room: { name: 'asc' } }
      ],
    });

    return responseHandler(res, 200, 'Rate date prices fetched successfully', rateDatePrices);
  } catch (error) {
    return handleError(res, error as Error);
  }
};

export const getRatePricesForDateRange = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId } = req.params;
    const { startDate, endDate, roomIds } = req.query;

    if (!startDate || !endDate) {
      return responseHandler(res, 400, 'startDate and endDate are required');
    }

    const whereClause: any = {
      ratePolicyId,
      isActive: true,
      date: {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      },
    };

    if (roomIds) {
      const roomIdArray = Array.isArray(roomIds) ? roomIds : [roomIds];
      whereClause.roomId = {
        in: roomIdArray as string[],
      };
    }

    const rateDatePrices = await prisma.rateDatePrice.findMany({
      where: whereClause,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            price: true,
          }
        }
      }
    });

    return responseHandler(res, 200, 'Rate prices for date range fetched successfully', rateDatePrices);
  } catch (error) {
    return handleError(res, error as Error);
  }
};

export const upsertRateDatePrices = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId } = req.params;
    const { prices } = req.body;

    if (!Array.isArray(prices)) {
      return responseHandler(res, 400, 'prices must be an array');
    }

    // Verify rate policy exists
    const ratePolicy = await prisma.ratePolicy.findUnique({
      where: { id: ratePolicyId }
    });

    if (!ratePolicy) {
      return responseHandler(res, 404, 'Rate policy not found');
    }

    const results = [];

    for (const priceData of prices) {
      const { roomId, date, price, priceType = 'ROOM_OVERRIDE' } = priceData;

      if (!roomId || !date || price === undefined) {
        continue;
      }

      // Verify room exists
      const room = await prisma.room.findUnique({
        where: { id: roomId }
      });

      if (!room) {
        continue;
      }

      const result = await prisma.rateDatePrice.upsert({
        where: {
          ratePolicyId_roomId_date: {
            ratePolicyId,
            roomId,
            date: new Date(date),
          }
        },
        update: {
          price: parseFloat(price),
          priceType,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          ratePolicyId,
          roomId,
          date: new Date(date),
          price: parseFloat(price),
          priceType,
          isActive: true,
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              price: true,
            }
          }
        }
      });

      results.push(result);
    }

    return responseHandler(res, 200, `Updated ${results.length} rate date prices`, results);
  } catch (error) {
    return handleError(res, error as Error);
  }
};

export const deleteRateDatePrice = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId, id } = req.params;

    const rateDatePrice = await prisma.rateDatePrice.findUnique({
      where: { id },
    });

    if (!rateDatePrice) {
      return responseHandler(res, 404, 'Rate date price not found');
    }

    if (rateDatePrice.ratePolicyId !== ratePolicyId) {
      return responseHandler(res, 403, 'Rate date price does not belong to this rate policy');
    }

    await prisma.rateDatePrice.delete({
      where: { id },
    });

    return responseHandler(res, 200, 'Rate date price deleted successfully');
  } catch (error) {
    return handleError(res, error as Error);
  }
};