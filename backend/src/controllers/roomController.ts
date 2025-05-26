import prisma from "../prisma";
import { Request, Response } from "express";
import { handleError, responseHandler } from "../utils/helper";
import { eachDayOfInterval, format } from "date-fns";

export const getAllRooms = async (req: Request, res: Response) => {

    // here it is possible to get non null vaules from ratePolicy table
    try {
        const rooms = await prisma.room.findMany({ include: { images: true, RoomRate: {
         select: {
            ratePolicy: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    nightlyRate: true,
                    discountPercentage: true,
                    isActive: true,
                    refundable: true,
                    prepayPercentage: true,
                    fullPaymentDays: true,  
                    changeAllowedDays: true,
                    rebookValidityDays: true,
                }
            }
         }    
        } } });
        
        responseHandler(res, 200, "Rooms fetched successfully", rooms);
    } catch (e) {
        handleError(res, e as Error);
    }
};

export const getRoomById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    handleError(res, new Error("Room ID is required"));
    return;
  }

  try {
    const room = await prisma.room.findUnique({ where: { id }, include: { images: true } });
    responseHandler(res, 200, "Room fetched successfully", room);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const getCalendarAvailability = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
  
    if (startDate === "null" || endDate === "null" || !startDate || !endDate) {
      responseHandler(res, 400, "Missing startDate or endDate");
      return;
    }
  
    try {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const allDates = eachDayOfInterval({ start, end }).map((d) =>
        format(d, "yyyy-MM-dd")
      );
  
      // 1. Fetch all rooms
      const rooms = await prisma.room.findMany({
        include: {
            images: true,
            RoomRate: {
                select: {
                    ratePolicy: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            nightlyRate: true,
                            discountPercentage: true,
                            isActive: true,
                            refundable: true,
                            prepayPercentage: true,
                            fullPaymentDays: true,  
                            changeAllowedDays: true,
                            rebookValidityDays: true,
                        }
                    }
                 }    
            }
        }
      });

      const roomIds = rooms.map((room) => room.id);
      const totalRooms = roomIds.length;
  
      // 2. Fetch bookings and holds
      const bookings = await prisma.booking.findMany({
        where: {
          roomId: { in: roomIds },
          status: "CONFIRMED",
          checkIn: { lte: end },
          checkOut: { gte: start },
        },
        select: { roomId: true, checkIn: true, checkOut: true },
      });
  
      const holds = await prisma.temporaryHold.findMany({
        where: {
          roomId: { in: roomIds },
          checkIn: { lte: end },
          checkOut: { gte: start },
          expiresAt: { gt: new Date() },
        },
        select: { roomId: true, checkIn: true, checkOut: true },
      });
  
      // 3. Build map of date => Set of roomIds booked/held on that day
      const dateMap = new Map<string, Set<string>>();
      [...bookings, ...holds].forEach(({ roomId, checkIn, checkOut }) => {
        eachDayOfInterval({ start: checkIn, end: checkOut }).forEach((day) => {
          const key = format(day, "yyyy-MM-dd");
          if (!dateMap.has(key)) dateMap.set(key, new Set());
          dateMap.get(key)?.add(roomId);
        });
      });
  
      // 4. Compute date categories
      const fullyBookedDates: string[] = [];
      const partiallyBookedDates: string[] = [];
  
      allDates.forEach((date) => {
        const bookedCount = dateMap.get(date)?.size || 0;
        if (bookedCount >= totalRooms) {
          fullyBookedDates.push(date);
        } else if (bookedCount > 0) {
          partiallyBookedDates.push(date);
        }
      });
  
      const availableDates = allDates.filter(
        (date) =>
          !fullyBookedDates.includes(date) && !partiallyBookedDates.includes(date)
      );
  
      // 5. Build roomBookingMap
      const roomBookingMap: Record<string, Set<string>> = {};
      [...bookings, ...holds].forEach(({ roomId, checkIn, checkOut }) => {
        const dates = eachDayOfInterval({ start: checkIn, end: checkOut }).map((d) =>
          format(d, "yyyy-MM-dd")
        );
        if (!roomBookingMap[roomId]) {
          roomBookingMap[roomId] = new Set();
        }
        dates.forEach((date) => roomBookingMap[roomId].add(date));
      });
  
      // 6. Separate available and unavailable rooms
      const availableRooms = [];
      const unavailableRooms = [];
  
      for (const room of rooms) {
        const bookedDates = Array.from(roomBookingMap[room.id] || []);
        const bookedSet = new Set(bookedDates);
  
        const isFullyBooked = allDates.every((date) => bookedSet.has(date));
        const roomWithBookedDates = { ...room, bookedDates };
  
        if (isFullyBooked) {
          unavailableRooms.push(roomWithBookedDates);
        } else {
          availableRooms.push(roomWithBookedDates);
        }
      }
  
      // 7. Respond with calendar availability
      responseHandler(res, 200, "Calendar availability fetched successfully", {
        fullyBookedDates,
        partiallyBookedDates,
        availableDates,
        availableRooms,
        unavailableRooms,
      });
    } catch (error) {
      console.error(error);
      handleError(res, error as Error);
    }
};
  

export const checkRoomAvailability = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;
  
    if (!id || !startDate || !endDate) {
        responseHandler(res, 400, "roomId, startDate and endDate are required.");
        return;
    }
  
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
  
      // Check bookings that conflict with the given date range
      const bookings = await prisma.booking.findMany({
        where: {
          id,
          AND: [
            { checkIn: { lte: end } },
            { checkOut: { gte: start } },
          ],
        },
      });
  
      const holds = await prisma.temporaryHold.findMany({
        where: {
          roomId: id,
          AND: [
            { checkIn: { lte: end } },
            { checkOut: { gte: start } },
          ],
        },
      });
  
      const isAvailable = bookings.length === 0 && holds.length === 0;
  
      responseHandler(res, 200, "Availability checked successfully", { isAvailable, bookings, holds });
    } catch (error) {
      handleError(res, error as Error);
    }
};

export const getAvailableRooms = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.body;
  
    if (!startDate || !endDate) {
      responseHandler(res, 400, "Start date && end date is required");
      return;
    }
  
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
  
      // Get all rooms
      const allRooms = await prisma.room.findMany({
        include: { images: true }
      });
  
      const availableRooms = [];
  
      for (const room of allRooms) {
        // Check if room has any conflicting bookings
        const bookings = await prisma.booking.findFirst({
          where: {
            roomId: room.id,
            AND: [
              { checkIn: { lte: end } },
              { checkOut: { gte: start } },
            ],
          },
        });
  
        const hold = await prisma.temporaryHold.findFirst({
          where: {
            roomId: room.id,
            AND: [
              { checkIn: { lte: end } },
              { checkOut: { gte: start } },
            ],
          },
        });
  
        if (!bookings && !hold) {
          availableRooms.push({
            id: room.id,
            name: room.name,
            description: room.description,
            price: room.price,
            capacity: room.capacity,
            images: room.images.map(i => i.url)
          });
        }
      }
  
      responseHandler(res, 200, "Available rooms", availableRooms);
    } catch (error) {
      handleError(res, error as Error);
    }
};