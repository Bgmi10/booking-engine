import { Request, Response } from "express";
import prisma from "../prisma";
import { responseHandler, handleError } from "../utils/helper";

// Customer-facing enhancement endpoint
export const getEnhancements = async (req: Request, res: Response) => {
  const { days, checkIn, checkOut, roomId } = req.body;

  if (!checkIn || !checkOut) {
    responseHandler(res, 400, "Check-in and check-out dates are required");
    return;
  }

  try {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const currentDate = new Date();
    
    // Get days of week that fall within the date range
    const daysInRange = days || [];
    
    // Fetch all active enhancements with their rules
    const allEnhancements = await prisma.enhancement.findMany({
      where: {
        isActive: true
      },
      include: {
        enhancementRules: {
          where: {
            isActive: true,
            // Check overall validity period for rules
            OR: [
              { validFrom: null, validUntil: null },
              { validFrom: { lte: checkOutDate }, validUntil: null },
              { validFrom: null, validUntil: { gte: checkInDate } },
              { validFrom: { lte: checkOutDate }, validUntil: { gte: checkInDate } }
            ]
          }
        }
      }
    });

    // Filter enhancements based on their rules
    const availableEnhancements = [];
    
    for (const enhancement of allEnhancements) {
      // Check if any rule applies for this enhancement
      const applicableRules = enhancement.enhancementRules.filter((rule: any) => {
        // Check room scope
        if (rule.roomScope === 'SPECIFIC_ROOMS' && roomId) {
          if (!rule.roomIds.includes(roomId)) {
            return false;
          }
        }
        
        // Check availability type
        switch (rule.availabilityType) {
          case 'ALWAYS':
            return true;
            
          case 'WEEKLY':
            // Check if any of the days in the booking range match the available days
            if (!rule.availableDays || rule.availableDays.length === 0) {
              return false;
            }
            return rule.availableDays.some((day: string) => daysInRange.includes(day));
            
          case 'SPECIFIC_DATES':
            // Check if any specific dates fall within the booking range
            if (!rule.specificDates || rule.specificDates.length === 0) {
              return false;
            }
            return rule.specificDates.some((date: any) => {
              const specificDate = new Date(date);
              // Set time to start of day for date comparison
              specificDate.setHours(0, 0, 0, 0);
              const checkInDateStart = new Date(checkInDate);
              checkInDateStart.setHours(0, 0, 0, 0);
              const checkOutDateEnd = new Date(checkOutDate);
              checkOutDateEnd.setHours(23, 59, 59, 999);
              
              // Check if the specific date falls within the booking period
              return specificDate >= checkInDateStart && specificDate <= checkOutDateEnd;
            });
            
          case 'SEASONAL':
            // Check if booking dates overlap with the season
            if (!rule.seasonStart || !rule.seasonEnd) {
              return false;
            }
            const seasonStart = new Date(rule.seasonStart);
            const seasonEnd = new Date(rule.seasonEnd);
            
            // Check for overlap between booking dates and season dates
            return !(checkOutDate < seasonStart || checkInDate > seasonEnd);
            
          default:
            return false;
        }
      });
      
      // If any rule applies, include the enhancement with applicable rules
      if (applicableRules.length > 0) {
        availableEnhancements.push({
          id: enhancement.id,
          name: enhancement.name,
          description: enhancement.description,
          image: enhancement.image,
          price: enhancement.price,
          pricingType: enhancement.pricingType,
          applicableRules: applicableRules.map((rule: any) => ({
            id: rule.id,
            name: rule.name,
            availabilityType: rule.availabilityType,
            availableDays: rule.availableDays,
            availableTimeStart: rule.availableTimeStart,
            availableTimeEnd: rule.availableTimeEnd,
            specificDates: rule.specificDates,
            seasonal: rule.seasonal,
            seasonStart: rule.seasonStart,
            seasonEnd: rule.seasonEnd
          }))
        });
      }
    }

    responseHandler(res, 200, "Fetched enhancements successfully", availableEnhancements);
  } catch (error) {
    console.log(error);
    responseHandler(res, 500, "Internal server error");
  }
};

// Admin Enhancement CRUD operations
export const createEnhancement = async (req: Request, res: Response) => {
  const { 
    name, 
    price, 
    description, 
    image, 
    isActive, 
    pricingType,
    tax
  } = req.body;

  const enhancementData: any = {
    name,
    price,
    description,
    image,
    isActive,
    pricingType,
    tax
  };
  
  try {
    const enhancement = await prisma.enhancement.create({ data: enhancementData });
    responseHandler(res, 200, "Enhancement created successfully", enhancement);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const updateEnhancement = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    name, 
    price, 
    description, 
    image, 
    isActive, 
    pricingType,
    tax
  } = req.body;

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (price !== undefined) updateData.price = price;
  if (description !== undefined) updateData.description = description;
  if (image !== undefined) updateData.image = image;
  if (tax !== undefined) updateData.tax = tax;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (pricingType !== undefined) updateData.pricingType = pricingType;

  try {
    const enhancement = await prisma.enhancement.update({ where: { id }, data: updateData });
    responseHandler(res, 200, "Enhancement updated successfully", enhancement);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const deleteEnhancement = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.enhancement.delete({ where: { id } });
    responseHandler(res, 200, "Enhancement deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const getAllEnhancements = async (req: Request, res: Response) => {
  try {
    const enhancements = await prisma.enhancement.findMany({
      include: {
        enhancementRules: true
      }
    });
    responseHandler(res, 200, "All enhancements", enhancements);
  } catch (e) {
    handleError(res, e as Error);
  }
};

// Enhancement Rule CRUD operations
export const createEnhancementRule = async (req: Request, res: Response) => {
  const { 
    name,
    enhancementId,
    availabilityType,
    availableDays,
    availableTimeStart,
    availableTimeEnd,
    seasonal,
    seasonStart,
    seasonEnd,
    specificDates,
    validFrom,
    validUntil,
    roomScope,
    roomIds,
    isActive
  } = req.body;

  const ruleData: any = {
    name,
    enhancementId,
    availabilityType: availabilityType || 'ALWAYS',
    roomScope: roomScope || 'ALL_ROOMS',
    isActive: isActive !== undefined ? isActive : true
  };

  // Handle different availability types
  if (availabilityType === 'WEEKLY') {
    ruleData.availableDays = availableDays || [];
    ruleData.availableTimeStart = availableTimeStart || null;
    ruleData.availableTimeEnd = availableTimeEnd || null;
  }

  if (availabilityType === 'SEASONAL' || seasonal) {
    ruleData.seasonal = true;
    ruleData.seasonStart = seasonStart ? new Date(seasonStart) : null;
    ruleData.seasonEnd = seasonEnd ? new Date(seasonEnd) : null;
  }

  if (availabilityType === 'SPECIFIC_DATES' && specificDates) {
    ruleData.specificDates = specificDates.map((date: string) => new Date(date));
  }

  // Overall validity period
  if (validFrom) ruleData.validFrom = new Date(validFrom);
  if (validUntil) ruleData.validUntil = new Date(validUntil);

  // Room scope
  if (roomScope === 'SPECIFIC_ROOMS' && roomIds) {
    ruleData.roomIds = roomIds;
  }

  try {
    const rule = await prisma.enhancementRule.create({ data: ruleData });
    responseHandler(res, 200, "Enhancement rule created successfully", rule);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const updateEnhancementRule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    name,
    enhancementId,
    availabilityType,
    availableDays,
    availableTimeStart,
    availableTimeEnd,
    seasonal,
    seasonStart,
    seasonEnd,
    specificDates,
    validFrom,
    validUntil,
    roomScope,
    roomIds,
    isActive
  } = req.body;

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (enhancementId !== undefined) updateData.enhancementId = enhancementId;
  if (isActive !== undefined) updateData.isActive = isActive;
  
  // Handle availability type
  if (availabilityType !== undefined) {
    updateData.availabilityType = availabilityType;
    
    // Clear fields based on availability type
    if (availabilityType === 'ALWAYS') {
      updateData.availableDays = [];
      updateData.specificDates = [];
      updateData.seasonal = false;
    } else if (availabilityType === 'WEEKLY') {
      updateData.availableDays = availableDays || [];
      updateData.availableTimeStart = availableTimeStart || null;
      updateData.availableTimeEnd = availableTimeEnd || null;
      updateData.specificDates = [];
      updateData.seasonal = false;
    } else if (availabilityType === 'SPECIFIC_DATES') {
      updateData.specificDates = specificDates ? specificDates.map((date: string) => new Date(date)) : [];
      updateData.availableDays = [];
      updateData.seasonal = false;
    } else if (availabilityType === 'SEASONAL') {
      updateData.seasonal = true;
      updateData.seasonStart = seasonStart ? new Date(seasonStart) : null;
      updateData.seasonEnd = seasonEnd ? new Date(seasonEnd) : null;
      updateData.specificDates = [];
    }
  }
  
  // Overall validity period
  if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null;
  if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;

  // Room scope
  if (roomScope !== undefined) {
    updateData.roomScope = roomScope;
    if (roomScope === 'SPECIFIC_ROOMS' && roomIds) {
      updateData.roomIds = roomIds;
    } else {
      updateData.roomIds = [];
    }
  }

  try {
    const rule = await prisma.enhancementRule.update({ where: { id }, data: updateData });
    responseHandler(res, 200, "Enhancement rule updated successfully", rule);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const deleteEnhancementRule = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.enhancementRule.delete({ where: { id } });
    responseHandler(res, 200, "Enhancement rule deleted successfully");
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const getAllEnhancementRules = async (req: Request, res: Response) => {
  try {
    const rules = await prisma.enhancementRule.findMany({
      include: {
        enhancement: true
      }
    });
    responseHandler(res, 200, "All enhancement rules", rules);
  } catch (e) {
    handleError(res, e as Error);
  }
};

export const getEnhancementRulesByEnhancementId = async (req: Request, res: Response) => {
  const { enhancementId } = req.params;
  
  try {
    const rules = await prisma.enhancementRule.findMany({
      where: { enhancementId },
      include: {
        enhancement: true
      }
    });
    responseHandler(res, 200, "Enhancement rules", rules);
  } catch (e) {
    handleError(res, e as Error);
  }
};
