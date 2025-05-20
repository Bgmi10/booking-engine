import prisma from "../prisma";
import { Request, Response } from "express";
import { handleError, responseHandler } from "../utils/helper";
import { addDays, eachDayOfInterval, format } from "date-fns";

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
    const room = await prisma.roomCategory.findUnique({ where: { id }, include: { images: true } });
    responseHandler(res, 200, "Room fetched successfully", room);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const getCalendarAvailability = async (req: Request, res: Response) => {
    const { startDate, endDate, categoryId } = req.query;
  
    if (!startDate || !endDate) {
      responseHandler(res, 400, "Start date and end date are required in query params");
      return;
    }
  
    try {
      // Get all room categories with their rooms
      const allCategories = await prisma.roomCategory.findMany({
        where: categoryId ? { id: String(categoryId) } : {},
        include: {
          images: true,
          rooms: {
            where: {
              isActive: true
            }
          }
        }
      });
  
      // Get all bookings within the date range
      const bookings = await prisma.booking.findMany({
        where: {
          checkIn: { lte: new Date(endDate as string) },
          checkOut: { gte: new Date(startDate as string) },
          room: categoryId ? { categoryId: String(categoryId) } : {}
        },
        include: {
          room: true
        }
      });
  
      // Get temporary holds within the date range
      const holds = await prisma.temporaryHold.findMany({
        where: {
          checkIn: { lte: new Date(endDate as string) },
          checkOut: { gte: new Date(startDate as string) },
          expiresAt: { gt: new Date() }, // Only include non-expired holds
          room: categoryId ? { categoryId: String(categoryId) } : {}
        },
        include: {
          room: true
        }
      });
  
      const allDates = eachDayOfInterval({
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      });
  
      // Create a map of date -> set of booked room IDs
      const dateToBookedRoomIds = new Map<string, Set<string>>();
      
      // Add bookings to the map
      bookings.forEach(({ checkIn, checkOut, roomId }) => {
        eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) }).forEach((date) => {
          const formattedDate = format(date, "yyyy-MM-dd");
          if (!dateToBookedRoomIds.has(formattedDate)) {
            dateToBookedRoomIds.set(formattedDate, new Set<string>());
          }
          dateToBookedRoomIds.get(formattedDate)?.add(roomId);
        });
      });
  
      // Add holds to the map
      holds.forEach(({ checkIn, checkOut, roomId }) => {
        eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) }).forEach((date) => {
          const formattedDate = format(date, "yyyy-MM-dd");
          if (!dateToBookedRoomIds.has(formattedDate)) {
            dateToBookedRoomIds.set(formattedDate, new Set<string>());
          }
          dateToBookedRoomIds.get(formattedDate)?.add(roomId);
        });
      });
  
      // Create detailed information for each date
      const calendarData = allDates.map((date) => {
        const formattedDate = format(date, "yyyy-MM-dd");
        const bookedRoomIds = dateToBookedRoomIds.get(formattedDate) || new Set<string>();
        
        // Calculate availability by category
        const categoryAvailability = allCategories.map(category => {
          const totalRoomsInCategory = category.rooms.length;
          const availableRooms = category.rooms.filter(room => !bookedRoomIds.has(room.id));
          const bookedRooms = category.rooms.filter(room => bookedRoomIds.has(room.id));
          
          return {
            categoryId: category.id,
            categoryName: category.name,
            description: category.description,
            price: category.price,
            capacity: category.capacity,
            imageUrl: category.images.length > 0 ? category.images[0].url : null,
            totalRooms: totalRoomsInCategory,
            availableRooms: availableRooms.length,
            bookedRooms: bookedRooms.length,
            isFullyBooked: availableRooms.length === 0,
            // Include room numbers for available rooms if needed
            availableRoomNumbers: availableRooms.map(room => room.roomNumber)
          };
        });
        
        const isFullyBooked = categoryAvailability.every(cat => cat.isFullyBooked);
        
        return {
          date: formattedDate,
          isFullyBooked,
          categories: categoryAvailability
        };
      });
  
      // Calculate available and fully booked dates
      const fullyBookedDates = calendarData
        .filter(day => day.isFullyBooked)
        .map(day => day.date);
        
      const availableDates = calendarData
        .filter(day => !day.isFullyBooked)
        .map(day => day.date);
  
      responseHandler(res, 200, "Calendar availability fetched successfully", {
        availableDates,
        bookedDates: fullyBookedDates,
        calendarData
      });
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
      const allRooms = await prisma.roomCategory.findMany({
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



