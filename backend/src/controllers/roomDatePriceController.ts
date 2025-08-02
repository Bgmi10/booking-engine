import prisma from "../prisma";
import { Request, Response } from "express";
import { handleError, responseHandler } from "../utils/helper";
import { format, parseISO, startOfDay, isBefore } from "date-fns";

// Get room date prices for a specific date range
export const getRoomDatePrices = async (req: Request, res: Response) => {
  const { startDate, endDate, roomIds } = req.query;

  if (!startDate || !endDate) {
    responseHandler(res, 400, "Start date and end date are required");
    return;
  }

  try {
    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);

    // Build where condition
    const whereCondition: any = {
      date: {
        gte: start,
        lte: end,
      },
      isActive: true,
    };

    // Add room filter if provided
    if (roomIds) {
      const roomIdArray = Array.isArray(roomIds) ? roomIds : [roomIds];
      whereCondition.roomId = { in: roomIdArray };
    }

    const datePrices = await prisma.roomDatePrice.findMany({
      where: whereCondition,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            price: true, // base price
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { room: { name: 'asc' } },
      ],
    });

    responseHandler(res, 200, "Room date prices fetched successfully", datePrices);
  } catch (error) {
    console.error("Error fetching room date prices:", error);
    handleError(res, error as Error);
  }
};

// Get room prices for specific dates (used by booking system)
export const getRoomPricesForDateRange = async (req: Request, res: Response) => {
  const { roomId, startDate, endDate } = req.query;

  if (!roomId || !startDate || !endDate) {
    responseHandler(res, 400, "Room ID, start date and end date are required");
    return;
  }

  try {
    const start = parseISO(startDate as string);
    const end = parseISO(endDate as string);

    // Get the room's base price
    const room = await prisma.room.findUnique({
      where: { id: roomId as string },
      select: { id: true, name: true, price: true },
    });

    if (!room) {
      responseHandler(res, 404, "Room not found");
      return;
    }

    // Get any custom prices for the date range
    const customPrices = await prisma.roomDatePrice.findMany({
      where: {
        roomId: roomId as string,
        date: {
          gte: start,
          lte: end,
        },
        isActive: true,
      },
      orderBy: { date: 'asc' },
    });

    // Create a map of dates to prices
    const priceMap: { [date: string]: number } = {};
    customPrices.forEach(price => {
      const dateKey = format(price.date, 'yyyy-MM-dd');
      priceMap[dateKey] = price.price;
    });

    responseHandler(res, 200, "Room prices for date range fetched successfully", {
      room,
      basePrice: room.price,
      customPrices: priceMap,
    });
  } catch (error) {
    console.error("Error fetching room prices for date range:", error);
    handleError(res, error as Error);
  }
};

// Create or update room date prices (bulk operation)
export const upsertRoomDatePrices = async (req: Request, res: Response) => {
  const { prices } = req.body;

  if (!prices || !Array.isArray(prices) || prices.length === 0) {
    responseHandler(res, 400, "Prices array is required");
    return;
  }

  try {
    const today = startOfDay(new Date());
    const validPrices: any = [];
    const errors = [];

    // Validate each price entry
    for (const price of prices) {
      const { roomId, date, price: priceValue } = price;

      if (!roomId || !date || priceValue === undefined) {
        errors.push(`Invalid price entry: missing roomId, date, or price`);
        continue;
      }

      const dateObj = parseISO(date);
      
      // Don't allow setting prices for past dates (but allow today)
      if (isBefore(dateObj, today)) {
        errors.push(`Cannot set price for past date: ${date}`);
        continue;
      }

      // Verify room exists
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, price: true },
      });

      if (!room) {
        errors.push(`Room not found: ${roomId}`);
        continue;
      }

      validPrices.push({
        roomId,
        date: dateObj,
        price: parseFloat(priceValue.toString()),
      });
    }

    if (errors.length > 0 && validPrices.length === 0) {
      responseHandler(res, 400, "No valid prices to save", { errors });
      return;
    }

    // Use transactions to ensure data integrity
    const results = await prisma.$transaction(async (tx) => {
      const upsertResults = [];

      for (const priceData of validPrices) {
        const { roomId, date, price } = priceData;

        // Get room's base price to determine if we should save this custom price
        const room = await tx.room.findUnique({
          where: { id: roomId },
          select: { price: true },
        });

        if (!room) continue;

        if (price === room.price) {
          // If the price equals base price, remove any existing custom price
          await tx.roomDatePrice.updateMany({
            where: {
              roomId,
              date,
            },
            data: {
              isActive: false,
            },
          });
        } else {
          // Upsert the custom price
          const result = await tx.roomDatePrice.upsert({
            where: {
              roomId_date: {
                roomId,
                date,
              },
            },
            update: {
              price,
              isActive: true,
            },
            create: {
              roomId,
              date,
              price,
              isActive: true,
            },
          });
          upsertResults.push(result);
        }
      }

      return upsertResults;
    });

    responseHandler(res, 200, "Room date prices saved successfully", {
      savedPrices: results.length,
      totalProcessed: validPrices.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error saving room date prices:", error);
    handleError(res, error as Error);
  }
};

// Delete a specific room date price
export const deleteRoomDatePrice = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    responseHandler(res, 400, "Price ID is required");
    return;
  }

  try {
    // Check if the price exists
    const existingPrice = await prisma.roomDatePrice.findUnique({
      where: { id },
    });

    if (!existingPrice) {
      responseHandler(res, 404, "Price not found");
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.roomDatePrice.update({
      where: { id },
      data: { isActive: false },
    });

    responseHandler(res, 200, "Room date price deleted successfully");
  } catch (error) {
    console.error("Error deleting room date price:", error);
    handleError(res, error as Error);
  }
};