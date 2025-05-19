import prisma from "../prisma";
import { Request, Response } from "express";
import { handleError, responseHandler } from "../utils/helper";
import { eachDayOfInterval, format } from "date-fns";

export const getAllRooms = async (req: Request, res: Response) => {
    try {
        const rooms = await prisma.room.findMany();
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
    const { startDate, endDate, roomId } = req.query;
  
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          ...(roomId ? { roomId: String(roomId) } : {}),
          checkIn: { lte: new Date(endDate as string) },
          checkOut: { gte: new Date(startDate as string) },
        },
        select: { checkIn: true, checkOut: true },
      });
  
      const allDates = eachDayOfInterval({
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      });
  
      const bookedDates = new Set<string>();
      bookings.forEach(({ checkIn, checkOut }) => {
        eachDayOfInterval({ start: checkIn, end: checkOut }).forEach((d) => {
          bookedDates.add(format(d, "yyyy-MM-dd"));
        });
      });
  
      const availableDates = allDates
        .map((d) => format(d, "yyyy-MM-dd"))
        .filter((d) => !bookedDates.has(d));
  
      responseHandler(res, 200, "Calendar availability fetched successfully", { availableDates, bookedDates: Array.from(bookedDates) });
    } catch (error) {
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