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

export const  upsertRateDatePrices = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId } = req.params;
    //@ts-ignore
    const user = req.user;
    const { prices, bulkActionType } = req.body;

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

    if (results.length > 0) {
      const dates = prices.map(p => new Date(p.date)).sort((a, b) => a.getTime() - b.getTime());
      const dateRangeStart = dates[0];
      const dateRangeEnd = dates[dates.length - 1];
      const roomsAffected = [...new Set(prices.map(p => p.roomId))];
      
      // Calculate unique days affected (0=Sunday, 6=Saturday)
      const daysAffected = [...new Set(dates.map(date => date.getDay()))].sort((a, b) => a - b);
      
      const overRideDetails = {
        action: bulkActionType,
        changes: results.map((result) => ({
          roomId:  result.roomId,
          affectedDates: dates.length
        }))
      }

      await prisma.bulkOverRideLogs.create({
        data: {
          actionType: bulkActionType || "BULK_OVERRIDE",
          dateRangeEnd: new Date(dateRangeEnd),
          dateRangeStart: new Date(dateRangeStart),
          roomsAffected,
          overRideDetails,
          ratePolicyId,
          userId: user.id,
          totalDatesAffected: dates.length,
          totalRoomsAffected: roomsAffected.length,
          daysAffected
        }
      })
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

// Update rate policy base price
export const updateRatePolicyBasePrice = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId } = req.params;
    const { basePrice } = req.body;

    if (basePrice === undefined || basePrice === null) {
      return responseHandler(res, 400, 'Base price is required');
    }

    const updatedRatePolicy = await prisma.ratePolicy.update({
      where: { id: ratePolicyId },
      data: { basePrice: parseFloat(basePrice) },
    });

    return responseHandler(res, 200, 'Rate policy base price updated successfully', updatedRatePolicy);
  } catch (error) {
    return handleError(res, error as Error);
  }
};

// Update room percentage adjustments for a rate policy
export const updateRoomPercentages = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId } = req.params;
    const { roomPercentages } = req.body;

    if (!Array.isArray(roomPercentages)) {
      return responseHandler(res, 400, 'roomPercentages must be an array');
    }

    // Verify rate policy exists
    const ratePolicy = await prisma.ratePolicy.findUnique({
      where: { id: ratePolicyId }
    });

    if (!ratePolicy) {
      return responseHandler(res, 404, 'Rate policy not found');
    }

    const results = [];

    for (const { roomId, percentageAdjustment } of roomPercentages) {
      if (!roomId) continue;

      // Check if RoomRate exists for this room and rate policy
      const existingRoomRate = await prisma.roomRate.findUnique({
        where: {
          roomId_ratePolicyId: {
            roomId,
            ratePolicyId
          }
        }
      });

      if (existingRoomRate) {
        // Update existing RoomRate
        const updated = await prisma.roomRate.update({
          where: {
            roomId_ratePolicyId: {
              roomId,
              ratePolicyId
            }
          },
          data: {
            percentageAdjustment: parseFloat(percentageAdjustment) || 0
          },
          include: {
            room: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        });
        results.push(updated);
      } else {
        // Create new RoomRate
        const created = await prisma.roomRate.create({
          data: {
            roomId,
            ratePolicyId,
            percentageAdjustment: parseFloat(percentageAdjustment) || 0,
            isActive: true
          },
          include: {
            room: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        });
        results.push(created);
      }
    }

    return responseHandler(res, 200, `Updated ${results.length} room percentages`, results);
  } catch (error) {
    return handleError(res, error as Error);
  }
};

// Get rate policy with base price and room percentages
export const getRatePolicyPricing = async (req: Request, res: Response) => {
  try {
    const { ratePolicyId } = req.params;

    const ratePolicy = await prisma.ratePolicy.findUnique({
      where: { id: ratePolicyId },
      include: {
        roomRates: {
          include: {
            room: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    });

    if (!ratePolicy) {
      return responseHandler(res, 404, 'Rate policy not found');
    }

    return responseHandler(res, 200, 'Rate policy pricing fetched successfully', ratePolicy);
  } catch (error) {
    return handleError(res, error as Error);
  }
};