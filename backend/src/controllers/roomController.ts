import prisma from "../prisma";
import { Request, Response } from "express";
import { handleError, responseHandler } from "../utils/helper";
import { eachDayOfInterval, format, getDay, isAfter, parseISO, isBefore, startOfDay } from "date-fns";

interface DateRestrictionInfo {
  canCheckIn: boolean;
  canCheckOut: boolean;
  canStay: boolean;
  minimumStay?: number;
  maximumStay?: number;
  restrictionReasons: string[];
  availableRates: string[];
}

interface EnhancedAvailabilityResponse {
  fullyBookedDates: string[];
  partiallyBookedDates: string[];
  availableDates: string[];
  restrictedDates: string[];
  availableRooms: EnhancedRoomAvailability[];
  unavailableRooms: EnhancedRoomAvailability[];
  generalSettings: any;
  dateRestrictions: Record<string, DateRestrictionInfo>;
}

interface EnhancedRoomAvailability {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  images: any[];
  bookedDates: string[];
  restrictedDates: string[];
  availableRates: RateAvailability[];
  minimumStay: number;
}

interface RateAvailability {
  ratePolicyId: string;
  name: string;
  price: number;
  isAvailable: boolean;
  restrictions: string[];
}

export const getAllRooms = async (req: Request, res: Response) => {
  try {
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
            },
          }    
        } 
      }
    });
    
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

const checkBookingRestrictions = async (
  date: Date,
  roomId?: string,
  ratePolicyId?: string,
  stayLength?: number
): Promise<DateRestrictionInfo> => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = getDay(date);
  const today = new Date();
  const todayStart = startOfDay(today);
  const dateStart = startOfDay(date);
  
  if (isBefore(dateStart, todayStart)) {
    return {
      canCheckIn: false,
      canCheckOut: false,
      canStay: false,
      restrictionReasons: ['Date is in the past'],
      availableRates: []
    };
  }

  // Fetch active restrictions that apply to this date
  const restrictions = await prisma.bookingRestriction.findMany({
    where: {
      isActive: true,
      startDate: { lte: date },
      endDate: { gte: date },
      OR: [
        { daysOfWeek: { isEmpty: true } },
        { daysOfWeek: { has: dayOfWeek } }
      ]
    },
    include: {
      exceptions: {
        where: {
          isActive: true,
          OR: [
            { exceptionDaysOfWeek: { isEmpty: true } },
            { exceptionDaysOfWeek: { has: dayOfWeek } },
            { exceptionStartDate: null },
            {
              AND: [
                { exceptionStartDate: { lte: date } },
                { exceptionEndDate: { gte: date } }
              ]
            }
          ],
        }
      }
    },
    orderBy: { priority: 'desc' }
  });

  let canCheckIn = true;
  let canCheckOut = true;
  let canStay = true;
  let minimumStay: number | undefined;
  let maximumStay: number | undefined;
  const restrictionReasons: string[] = [];
  const availableRates: string[] = [];

  // Process each restriction
  for (const restriction of restrictions) {
    // Check if restriction applies to this room
    const roomApplies = 
      restriction.roomScope === 'ALL_ROOMS' || 
      (restriction.roomScope === 'SPECIFIC_ROOMS' && roomId && restriction.roomIds.includes(roomId));
    
    // Check if restriction applies to this rate
    const rateApplies = 
      restriction.rateScope === 'ALL_RATES' || 
      (restriction.rateScope === 'SPECIFIC_RATES' && ratePolicyId && restriction.ratePolicyIds.includes(ratePolicyId));

    if (!roomApplies || !rateApplies) continue;

    // Check for exceptions that might override this restriction
    let exceptionApplies = false;
    for (const exception of restriction.exceptions) {
      // Check if exception applies to this room
      const exceptionRoomApplies = 
        !exception.roomScope || 
        exception.roomScope === 'ALL_ROOMS' || 
        (exception.roomScope === 'SPECIFIC_ROOMS' && roomId && exception.roomIds.includes(roomId));
      
      // Check if exception applies to this rate
      const exceptionRateApplies = 
        !exception.rateScope || 
        exception.rateScope === 'ALL_RATES' || 
        (exception.rateScope === 'SPECIFIC_RATES' && ratePolicyId && exception.ratePolicyIds.includes(ratePolicyId));

      // Check if exception applies to stay length
      const exceptionLengthApplies = 
        !exception.minLengthOverride || 
        (stayLength && stayLength >= exception.minLengthOverride);

      if (exceptionRoomApplies && exceptionRateApplies && exceptionLengthApplies) {
        exceptionApplies = true;
        break;
      }
    }

    if (exceptionApplies) continue; // Skip this restriction due to exception

    // Apply the restriction
    switch (restriction.type) {
      case 'CLOSE_TO_STAY':
        canStay = false;
        restrictionReasons.push(`Property closed for stays on ${dateStr} (${restriction.name})`);
        break;
      case 'CLOSE_TO_ARRIVAL':
        canCheckIn = false;
        restrictionReasons.push(`Check-in not allowed on ${dateStr} (${restriction.name})`);
        break;
      case 'CLOSE_TO_DEPARTURE':
        canCheckOut = false;
        restrictionReasons.push(`Check-out not allowed on ${dateStr} (${restriction.name})`);
        break;
      case 'MIN_LENGTH':
        if (restriction.minLength) {
          minimumStay = Math.max(minimumStay || 0, restriction.minLength);
        }
        break;
      case 'MAX_LENGTH':
        if (restriction.maxLength) {
          maximumStay = Math.min(maximumStay || Infinity, restriction.maxLength);
        }
        break;
      case 'ADVANCE_BOOKING':
        if (restriction.sameDayCutoffTime) {
          const now = new Date();
          const isToday = format(now, 'yyyy-MM-dd') === dateStr;
          if (isToday) {
            const [hours, minutes] = restriction.sameDayCutoffTime.split(':').map(Number);
            const cutoffTime = new Date(now);
            cutoffTime.setHours(hours, minutes, 0, 0);
            
            if (isAfter(now, cutoffTime)) {
              canCheckIn = false;
              restrictionReasons.push(`Same-day booking cutoff (${restriction.sameDayCutoffTime}) has passed`);
            }
          }
        }
        break;
    }
  }

  return {
    canCheckIn,
    canCheckOut,
    canStay,
    minimumStay,
    maximumStay,
    restrictionReasons,
    availableRates
  };
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
    const today = new Date();
    
    // Adjust start date to today if it's in the past
    const effectiveStart = isBefore(start, today) ? today : start;
    const allDates = eachDayOfInterval({ start: effectiveStart, end }).map((d) =>
      format(d, "yyyy-MM-dd")
    );

    // 1. Fetch all rooms with rates
    const rooms = await prisma.room.findMany({
      include: {
        images: true,
        RoomRate: {
          include: {
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

    const roomIds = rooms.map((room: any) => room.id);
    const totalRooms = roomIds.length;

    // 2. Fetch bookings and holds
    const bookings = await prisma.booking.findMany({
      where: {
        roomId: { in: roomIds },
        status: "CONFIRMED",
        checkIn: { lte: end },
        checkOut: { gte: effectiveStart },
      },
      select: { roomId: true, checkIn: true, checkOut: true },
    });

    const holds = await prisma.temporaryHold.findMany({
      where: {
        roomId: { in: roomIds },
        checkIn: { lte: end },
        checkOut: { gte: effectiveStart },
        expiresAt: { gt: new Date() },
      },
      select: { roomId: true, checkIn: true, checkOut: true },
    });

    // 3. Build booking map
    const dateMap = new Map<string, Set<string>>();
    [...bookings, ...holds].forEach(({ roomId, checkIn, checkOut }) => {
      eachDayOfInterval({ start: checkIn, end: checkOut }).forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        if (!dateMap.has(key)) dateMap.set(key, new Set());
        dateMap.get(key)?.add(roomId);
      });
    });

    // 4. Check restrictions for each date
    const dateRestrictions: Record<string, DateRestrictionInfo> = {};
    const restrictedDates: string[] = [];

    for (const dateStr of allDates) {
      const date = parseISO(dateStr);
      const restriction = await checkBookingRestrictions(date);
      dateRestrictions[dateStr] = restriction;
      
      if (!restriction.canStay) {
        restrictedDates.push(dateStr);
      }
    }

    // 5. Enhanced date categorization
    const fullyBookedDates: string[] = [];
    const partiallyBookedDates: string[] = [];

    allDates.forEach((date) => {
      const bookedCount = dateMap.get(date)?.size || 0;
      const isRestricted = restrictedDates.includes(date);
      
      if (isRestricted) return;
      
      if (bookedCount >= totalRooms) {
        fullyBookedDates.push(date);
      } else if (bookedCount > 0) {
        partiallyBookedDates.push(date);
      }
    });

    const availableDates = allDates.filter(
      (date) =>
        !fullyBookedDates.includes(date) && 
        !partiallyBookedDates.includes(date) &&
        !restrictedDates.includes(date)
    );

    // 6. Enhanced room availability with restrictions
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

    const availableRooms: EnhancedRoomAvailability[] = [];
    const unavailableRooms: EnhancedRoomAvailability[] = [];

    for (const room of rooms) {
      const bookedDates = Array.from(roomBookingMap[room.id] || []);
      const bookedSet = new Set(bookedDates);
      
      // Check which dates are restricted for this room
      const roomRestrictedDates: string[] = [];
      let currentMinimumStay = 1;
      
      for (const dateStr of allDates) {
        const date = parseISO(dateStr);
        if (isBefore(date, today)) {
          roomRestrictedDates.push(dateStr);
          continue;
        }
        
        const restriction = await checkBookingRestrictions(date, room.id);
        
        if (!restriction.canStay) {
          roomRestrictedDates.push(dateStr);
        }
        
        if (restriction.minimumStay) {
          currentMinimumStay = Math.max(currentMinimumStay, restriction.minimumStay);
        }
      }

      // Check rate availability
      const availableRates: RateAvailability[] = [];
      for (const roomRate of room.RoomRate) {
        const rateRestrictions: string[] = [];
        let isRateAvailable = true;
        
        for (const dateStr of allDates) {
          const date = parseISO(dateStr);
          if (isBefore(date, today)) {
            isRateAvailable = false;
            rateRestrictions.push('Date is in the past');
            continue;
          }
          
          const restriction = await checkBookingRestrictions(date, room.id, roomRate.ratePolicy.id);
          
          if (!restriction.canStay) {
            isRateAvailable = false;
            rateRestrictions.push(...restriction.restrictionReasons);
          }
        }
        
        availableRates.push({
          ratePolicyId: roomRate.ratePolicy.id,
          name: roomRate.ratePolicy.name,
          price: roomRate.ratePolicy.nightlyRate || room.price,
          isAvailable: isRateAvailable,
          restrictions: rateRestrictions
        });
      }

      const isFullyUnavailable = allDates.every((date) => 
        bookedSet.has(date) || roomRestrictedDates.includes(date)
      );

      const enhancedRoom: EnhancedRoomAvailability = {
        ...room,
        bookedDates,
        restrictedDates: roomRestrictedDates,
        availableRates,
        minimumStay: currentMinimumStay
      };

      if (isFullyUnavailable) {
        unavailableRooms.push(enhancedRoom);
      } else {
        availableRooms.push(enhancedRoom);
      }
    }

    const generalSettings = await prisma.generalSettings.findMany({
      select: { minStayDays: true, taxPercentage: true }
    });

    const response: EnhancedAvailabilityResponse = {
      fullyBookedDates,
      partiallyBookedDates,
      availableDates,
      restrictedDates,
      availableRooms,
      unavailableRooms,
      generalSettings,
      dateRestrictions
    };

    responseHandler(res, 200, "Enhanced calendar availability fetched successfully", response);
    
  } catch (error) {
    console.error(error);
    handleError(res, error as Error);
  }
};

export const validateBookingAttempt = async (req: Request, res: Response) => {
  const { roomId, checkIn, checkOut, ratePolicyId } = req.body;
  const today = new Date();

  if (!roomId || !checkIn || !checkOut) {
    responseHandler(res, 400, "roomId, checkIn, and checkOut are required");
    return;
  }

  try {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Immediately reject if check-in is in the past
    if (isBefore(checkInDate, today)) {
      responseHandler(res, 200, "Booking validation result", {
        isValid: false,
        reason: "Check-in date cannot be in the past"
      });
      return;
    }

    const stayLength = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check restrictions for check-in date
    const checkinRestriction = await checkBookingRestrictions(checkInDate, roomId, ratePolicyId, stayLength);
    if (!checkinRestriction.canCheckIn) {
      responseHandler(res, 200, "Booking validation result", {
        isValid: false,
        reason: `Check-in not allowed: ${checkinRestriction.restrictionReasons.join(', ')}`
      });
      return;
    }
    
    // Check restrictions for check-out date
    const checkoutRestriction = await checkBookingRestrictions(checkOutDate, roomId, ratePolicyId, stayLength);
    if (!checkoutRestriction.canCheckOut) {
      responseHandler(res, 200, "Booking validation result", {
        isValid: false,
        reason: `Check-out not allowed: ${checkoutRestriction.restrictionReasons.join(', ')}`
      });
      return;
    }
    
    // Check minimum stay requirements
    if (checkinRestriction.minimumStay && stayLength < checkinRestriction.minimumStay) {
      responseHandler(res, 200, "Booking validation result", {
        isValid: false,
        reason: `Minimum stay of ${checkinRestriction.minimumStay} nights required`
      });
      return;
    }
    
    // Check all dates in between for stay restrictions
    const stayDates = eachDayOfInterval({ start: checkInDate, end: checkOutDate });
    for (const date of stayDates) {
      const dayRestriction = await checkBookingRestrictions(date, roomId, ratePolicyId, stayLength);
      if (!dayRestriction.canStay) {
        responseHandler(res, 200, "Booking validation result", {
          isValid: false,
          reason: `Stay not allowed on ${format(date, 'yyyy-MM-dd')}: ${dayRestriction.restrictionReasons.join(', ')}`
        });
        return;
      }
    }
    
    responseHandler(res, 200, "Booking validation result", { isValid: true });
  } catch (e) {
    console.log(e);
    handleError(res, e as Error);
  }
};

export const checkRoomAvailability = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { startDate, endDate } = req.body;
  const today = new Date();

  if (!id || !startDate || !endDate) {
    responseHandler(res, 400, "roomId, startDate and endDate are required.");
    return;
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Adjust start date to today if it's in the past
    const effectiveStart = isBefore(start, today) ? today : start;

    // Check bookings that conflict with the given date range
    const bookings = await prisma.booking.findMany({
      where: {
        id,
        AND: [
          { checkIn: { lte: end } },
          { checkOut: { gte: effectiveStart } },
        ],
      },
    });

    const holds = await prisma.temporaryHold.findMany({
      where: {
        roomId: id,
        AND: [
          { checkIn: { lte: end } },
          { checkOut: { gte: effectiveStart } },
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
  const today = new Date();

  if (!startDate || !endDate) {
    responseHandler(res, 400, "Start date && end date is required");
    return;
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Adjust start date to today if it's in the past
    const effectiveStart = isBefore(start, today) ? today : start;

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
            { checkOut: { gte: effectiveStart } },
          ],
        },
      });

      const hold = await prisma.temporaryHold.findFirst({
        where: {
          roomId: room.id,
          AND: [
            { checkIn: { lte: end } },
            { checkOut: { gte: effectiveStart } },
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
          images: room.images.map((i: any) => i.url)
        });
      }
    }

    responseHandler(res, 200, "Available rooms", availableRooms);
  } catch (error) {
    handleError(res, error as Error);
  }
};