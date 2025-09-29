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
    const generalSettings = await prisma.generalSettings.findFirst();
    const standardCheckInTime = generalSettings?.standardCheckInTime || '14:00';
    const standardCheckOutTime = generalSettings?.standardCheckOutTime || '10:00';
    
    // Parse check-in and check-out times
    const [checkInHour, checkInMinute] = standardCheckInTime.split(':').map(Number);
    const [checkOutHour, checkOutMinute] = standardCheckOutTime.split(':').map(Number);
    
    // Get days of week that fall within the date range
    const daysInRange = days || [];
    
    // Fetch all active enhancements with their rules and event associations
    const allEnhancements = await prisma.enhancement.findMany({
      where: {
        isActive: true
      },
      include: {
        enhancementRules: {
          where: {
            isActive: true
          }
        },
        events: {
          select: {
            id: true,
            overridePrice: true,
            maxQuantity: true,
            isActive: true,
            event: {
              select: {
                id: true,
                name: true,
                description: true,
                eventDate: true,
                status: true
              }
            }
          }
        }
      }
    });

    // Filter enhancements based on their rules
    const availableEnhancements = [];
    
    for (const enhancement of allEnhancements) {
      // Check if enhancement has active events
      const hasActiveEvent = enhancement.events && enhancement.events.length > 0 && 
        enhancement.events.some((eventEnhancement: any) => 
          eventEnhancement.event && eventEnhancement.event.status !== 'CANCELLED'
        );
      
      // If it's an EVENT type but has no active events, skip it
      if (enhancement.type === 'EVENT' && !hasActiveEvent) {
        continue;
      }
      
      // Check if any rule applies for this enhancement
      const applicableRules = enhancement.enhancementRules.filter((rule: any) => {
        // Skip validity period check for SPECIFIC_DATES and SEASONAL
        // For these, the dates/season themselves determine availability
        if ((rule.validFrom || rule.validUntil) && 
            rule.availabilityType !== 'SPECIFIC_DATES' && 
            rule.availabilityType !== 'SEASONAL') {
          const validFrom = rule.validFrom ? new Date(rule.validFrom) : null;
          const validUntil = rule.validUntil ? new Date(rule.validUntil) : null;
          
          // For non-specific-date rules, check if booking overlaps with validity
          if (validFrom && checkOutDate < validFrom) {
            return false; // Booking ends before rule becomes valid
          }
          if (validUntil && checkInDate > validUntil) {
            return false; // Booking starts after rule expires
          }
        }
        
        // Check room scope
        if (rule.roomScope === 'SPECIFIC_ROOMS' && roomId) {
          if (!rule.roomIds.includes(roomId)) {
            return false;
          }
        }
        
        // Check time availability for events/enhancements
        // This will filter based on the check-in/check-out times
        if (rule.availableTimeStart && rule.availableTimeEnd && rule.specificDates && rule.specificDates.length > 0) {
          // For each specific date, check if it falls within guest's stay AND time constraints
          const validDates = rule.specificDates.filter((date: any) => {
            const eventDate = new Date(date);
            const eventDateStr = eventDate.toISOString().split('T')[0];
            const checkInDateStr = checkInDate.toISOString().split('T')[0];
            const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
            
            // Parse event times
            const [eventStartHour, eventStartMinute] = (rule.availableTimeStart || '00:00').split(':').map(Number);
            const [eventEndHour, eventEndMinute] = (rule.availableTimeEnd || '23:59').split(':').map(Number);
            
            // If event is on check-in date
            if (eventDateStr === checkInDateStr) {
              // Event must start after check-in time
              const eventStartsAfterCheckIn = eventStartHour > checkInHour || 
                (eventStartHour === checkInHour && eventStartMinute >= checkInMinute);
              return eventStartsAfterCheckIn;
            }
            
            // If event is on check-out date
            if (eventDateStr === checkOutDateStr) {
              // Event must end before check-out time
              const eventEndsBeforeCheckOut = eventEndHour < checkOutHour || 
                (eventEndHour === checkOutHour && eventEndMinute <= checkOutMinute);
              return eventEndsBeforeCheckOut;
            }
            
            // If event is between check-in and check-out dates (not on the same day)
            if (eventDate > checkInDate && eventDate < checkOutDate) {
              // Guest is present all day, show all events
              return true;
            }
            
            return false;
          });
          
          // If no valid dates remain after time filtering, exclude this rule
          if (validDates.length === 0) {
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
            
            // Convert both to uppercase for comparison since frontend sends "Saturday" but DB stores "SATURDAY"
            const upperDaysInRange = daysInRange.map((d: string) => d.toUpperCase());
            const hasMatchingDay = rule.availableDays.some((day: string) => upperDaysInRange.includes(day.toUpperCase()));
            
            if (!hasMatchingDay) {
              return false;
            }
            
            // If there are time constraints, we need to check if the enhancement is accessible
            if (rule.availableTimeStart && rule.availableTimeEnd) {
              const [ruleStartHour, ruleStartMinute] = rule.availableTimeStart.split(':').map(Number);
              const [ruleEndHour, ruleEndMinute] = rule.availableTimeEnd.split(':').map(Number);
              
              // Check if the rule falls on check-in or check-out day
              const checkInDayName = new Date(checkInDate).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
              const checkOutDayName = new Date(checkOutDate).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
              
              // If the rule applies to check-in day, check if it starts after check-in time
              if (rule.availableDays.includes(checkInDayName)) {
                const ruleStartsAfterCheckIn = ruleStartHour > checkInHour || 
                  (ruleStartHour === checkInHour && ruleStartMinute >= checkInMinute);
                if (!ruleStartsAfterCheckIn) {
                  // Rule starts before guest checks in on this day
                  return false;
                }
              }
              
              // If the rule applies to check-out day, check if it ends before check-out time  
              if (rule.availableDays.includes(checkOutDayName)) {
                const ruleEndsBeforeCheckOut = ruleEndHour < checkOutHour || 
                  (ruleEndHour === checkOutHour && ruleEndMinute <= checkOutMinute);
                if (!ruleEndsBeforeCheckOut) {
                  // Rule ends after guest checks out on this day
                  return false;
                }
              }
            }
            
            return true;
            
          case 'SPECIFIC_DATES':
            // Check if any specific dates fall within the booking range
            if (!rule.specificDates || rule.specificDates.length === 0) {
              return false;
            }
            return rule.specificDates.some((date: any) => {
              const specificDate = new Date(date);
              const specificDateStr = specificDate.toISOString().split('T')[0];
              const checkInDateStr = checkInDate.toISOString().split('T')[0];
              const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
              
              // If there are time constraints, apply time-based filtering
              if (rule.availableTimeStart && rule.availableTimeEnd) {
                const [eventEndHour, eventEndMinute] = rule.availableTimeEnd.split(':').map(Number);
                
                // If event is on check-in date
                if (specificDateStr === checkInDateStr) {
                  // Event must END AFTER check-in time (guest must be able to access it)
                  const eventEndsAfterCheckIn = eventEndHour > checkInHour || 
                    (eventEndHour === checkInHour && eventEndMinute > checkInMinute);
                  return eventEndsAfterCheckIn;
                }
                
                // If event is on check-out date
                if (specificDateStr === checkOutDateStr) {
                  // Event must end BEFORE check-out time (not at the same time)
                  const eventEndsBeforeCheckOut = eventEndHour < checkOutHour || 
                    (eventEndHour === checkOutHour && eventEndMinute < checkOutMinute);
                  return eventEndsBeforeCheckOut;
                }
                
                // If event is between check-in and check-out dates
                if (specificDate > checkInDate && specificDate < checkOutDate) {
                  return true;
                }
                
                return false;
              }
              
              // No time constraints, just check if date falls within stay period
              specificDate.setHours(0, 0, 0, 0);
              const checkInDateStart = new Date(checkInDate);
              checkInDateStart.setHours(0, 0, 0, 0);
              const checkOutDateEnd = new Date(checkOutDate);
              checkOutDateEnd.setHours(23, 59, 59, 999);
              
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
            const hasOverlap = !(checkOutDate < seasonStart || checkInDate > seasonEnd);
            
            if (!hasOverlap) {
              return false;
            }
            
            // If there are time constraints, check them for accessibility
            if (rule.availableTimeStart && rule.availableTimeEnd) {
              const [ruleStartHour, ruleStartMinute] = rule.availableTimeStart.split(':').map(Number);
              const [ruleEndHour, ruleEndMinute] = rule.availableTimeEnd.split(':').map(Number);
              
              // For SEASONAL rules with time constraints:
              // We need to check if the event time is accessible based on check-in/check-out times
              
              const checkInDateStr = checkInDate.toISOString().split('T')[0];
              const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
              
              // Determine if we need to apply time constraints based on the booking dates
              let needsTimeCheck = false;
              
              // If check-in or check-out date is within the season period
              if ((checkInDate >= seasonStart && checkInDate <= seasonEnd) ||
                  (checkOutDate >= seasonStart && checkOutDate <= seasonEnd)) {
                needsTimeCheck = true;
              }
              
              if (needsTimeCheck) {
                // Check if this is a single-day booking
                if (checkInDateStr === checkOutDateStr) {
                  // For same-day check-in/out, event must be between check-in and check-out times
                  const eventEndsAfterCheckIn = ruleEndHour > checkInHour || 
                    (ruleEndHour === checkInHour && ruleEndMinute > checkInMinute);
                  const eventStartsBeforeCheckOut = ruleStartHour < checkOutHour || 
                    (ruleStartHour === checkOutHour && ruleStartMinute < checkOutMinute);
                  
                  if (!eventEndsAfterCheckIn || !eventStartsBeforeCheckOut) {
                    return false;
                  }
                } else {
                  // Multi-day booking - for SEASONAL rules, the event happens every day in the season
                  // We need to check if the event is accessible on at least one day of the stay
                  
                  let canAttendEvent = false;
                  
                  // Check each day of the booking to see if guest can attend
                  const currentDay = new Date(checkInDate);
                  while (currentDay <= checkOutDate) {
                    const currentDayStr = currentDay.toISOString().split('T')[0];
                    
                    // Skip days outside the season
                    if (currentDay < seasonStart || currentDay > seasonEnd) {
                      currentDay.setDate(currentDay.getDate() + 1);
                      continue;
                    }
                    
                    // Check if guest can attend on this day
                    if (currentDayStr === checkInDateStr) {
                      // On check-in day, event must end after check-in time
                      const eventEndsAfterCheckIn = ruleEndHour > checkInHour || 
                        (ruleEndHour === checkInHour && ruleEndMinute > checkInMinute);
                      if (eventEndsAfterCheckIn) {
                        canAttendEvent = true;
                        break;
                      }
                    } else if (currentDayStr === checkOutDateStr) {
                      // On check-out day, event must start before check-out time
                      const eventStartsBeforeCheckOut = ruleStartHour < checkOutHour || 
                        (ruleStartHour === checkOutHour && ruleStartMinute < checkOutMinute);
                      if (eventStartsBeforeCheckOut) {
                        canAttendEvent = true;
                        break;
                      }
                    } else {
                      // On middle days, guest is there all day, can attend the event
                      canAttendEvent = true;
                      break;
                    }
                    
                    currentDay.setDate(currentDay.getDate() + 1);
                  }
                  
                  if (!canAttendEvent) {
                    return false;
                  }
                }
              }
            }
            
            return true;
            
          default:
            return false;
        }
      });
      
      // Check if we need to count ALL rules (not just active ones) to determine if enhancement has rules
      const totalRulesCount = await prisma.enhancementRule.count({
        where: { 
          enhancementId: enhancement.id,
          isActive: true 
        }
      });
      
      // Get all active events that fall within the booking date range
      let applicableEvents: any[] = [];
      if (hasActiveEvent) {
        applicableEvents = enhancement.events.filter((ee: any) => {
          if (!ee.event || ee.event.status === 'CANCELLED') {
            return false;
          }
          
          // Check if event date falls within the booking period
          const eventDate = new Date(ee.event.eventDate);
          const eventDateStr = eventDate.toISOString().split('T')[0];
          const checkInDateStr = checkInDate.toISOString().split('T')[0];
          const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
          
          // Event must be during the guest's stay (inclusive of check-in, exclusive of check-out)
          return eventDateStr >= checkInDateStr && eventDateStr < checkOutDateStr;
        });
      }
      
      // If enhancement has no active rules at all, it's always available
      // If it has rules, at least one must apply
      if (totalRulesCount === 0) {
        // No rules exist - enhancement is always available
        
        // For EVENT type enhancements, create separate entries for each applicable event
        if (hasActiveEvent && enhancement.type === 'EVENT' && applicableEvents.length > 0) {
          for (const eventEnhancement of applicableEvents) {
            const activeEvent = eventEnhancement.event;
            const enhancementData: any = {
              id: enhancement.id,
              name: activeEvent.name,
              description: activeEvent.description,
              image: enhancement.image,
              tax: enhancement.tax,
              price: (eventEnhancement.overridePrice !== null) 
                ? eventEnhancement.overridePrice 
                : enhancement.price,
              pricingType: enhancement.pricingType,
              applicableRules: [],
              type: enhancement.type,
              eventId: activeEvent.id,
              eventDate: activeEvent.eventDate,
              eventStatus: activeEvent.status,
              enhancementName: enhancement.name
            };
            
            if (eventEnhancement.maxQuantity) {
              enhancementData.maxQuantity = eventEnhancement.maxQuantity;
            }
            
            availableEnhancements.push(enhancementData);
          }
        } else if (!hasActiveEvent || enhancement.type !== 'EVENT') {
          // For non-EVENT enhancements or those without active events
          const enhancementData: any = {
            id: enhancement.id,
            name: enhancement.name,
            description: enhancement.description,
            image: enhancement.image,
            tax: enhancement.tax,
            price: enhancement.price,
            pricingType: enhancement.pricingType,
            applicableRules: []
          };
          
          availableEnhancements.push(enhancementData);
        }
      } else if (applicableRules.length > 0) {
        // Has rules and at least one applies
        
        // For EVENT type enhancements, create separate entries for each applicable event
        if (hasActiveEvent && enhancement.type === 'EVENT' && applicableEvents.length > 0) {
          for (const eventEnhancement of applicableEvents) {
            const activeEvent = eventEnhancement.event;
            const enhancementData: any = {
              id: enhancement.id,
              name: activeEvent.name,
              description: activeEvent.description,
              image: enhancement.image,
              tax: enhancement.tax,
              price: (eventEnhancement.overridePrice !== null) 
                ? eventEnhancement.overridePrice 
                : enhancement.price,
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
              })),
              type: enhancement.type,
              eventId: activeEvent.id,
              eventDate: activeEvent.eventDate,
              eventStatus: activeEvent.status,
              enhancementName: enhancement.name
            };
            
            if (eventEnhancement.maxQuantity) {
              enhancementData.maxQuantity = eventEnhancement.maxQuantity;
            }
            
            availableEnhancements.push(enhancementData);
          }
        } else if (!hasActiveEvent || enhancement.type !== 'EVENT') {
          // For non-EVENT enhancements or those without active events
          const enhancementData: any = {
            id: enhancement.id,
            name: enhancement.name,
            description: enhancement.description,
            image: enhancement.image,
            tax: enhancement.tax,
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
          };
          
          availableEnhancements.push(enhancementData);
        }
      }
      // If has rules but none apply, don't show the enhancement
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
    tax,
    type
  } = req.body;

  const enhancementData: any = {
    name,
    price,
    description,
    image,
    isActive,
    pricingType,
    tax,
    type: type || 'PRODUCT' // Default to PRODUCT if not specified
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
    tax,
    type
  } = req.body;

  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (price !== undefined) updateData.price = price;
  if (description !== undefined) updateData.description = description;
  if (image !== undefined) updateData.image = image;
  if (tax !== undefined) updateData.tax = tax;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (pricingType !== undefined) updateData.pricingType = pricingType;
  if (type !== undefined) updateData.type = type;

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
    const { type } = req.query; // Optional filter by type
    
    const whereClause: any = {};
    if (type) {
      whereClause.type = type;
    }
    
    const enhancements = await prisma.enhancement.findMany({
      where: whereClause,
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
    isActive: isActive !== undefined ? isActive : true,
    // Time fields should be available for all availability types
    availableTimeStart: availableTimeStart || null,
    availableTimeEnd: availableTimeEnd || null
  };

  // Handle different availability types
  if (availabilityType === 'WEEKLY') {
    ruleData.availableDays = availableDays || [];
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
    // Check for duplicate rule (ignoring name since it's just a label)
    const whereConditions: any = {
      enhancementId,
      availabilityType,
      availableTimeStart: availableTimeStart || null,
      availableTimeEnd: availableTimeEnd || null,
      roomScope
    };

    if (availabilityType === 'WEEKLY') {
      whereConditions.availableDays = {
        equals: availableDays || []
      };
    }

    if (availabilityType === 'SPECIFIC_DATES') {
      whereConditions.specificDates = {
        equals: specificDates ? specificDates.map((date: string) => new Date(date)) : []
      };
    }

    if (availabilityType === 'SEASONAL') {
      whereConditions.seasonal = true;
      whereConditions.seasonStart = seasonStart ? new Date(seasonStart) : null;
      whereConditions.seasonEnd = seasonEnd ? new Date(seasonEnd) : null;
    }

    if (roomScope === 'SPECIFIC_ROOMS') {
      whereConditions.roomIds = {
        equals: roomIds || []
      };
    }

    // Also check for validity period
    if (validFrom) whereConditions.validFrom = new Date(validFrom);
    if (validUntil) whereConditions.validUntil = new Date(validUntil);

    const existingRule = await prisma.enhancementRule.findFirst({
      where: whereConditions
    });

    if (existingRule) {
      responseHandler(res, 400, `A rule with identical settings already exists for this enhancement (Rule: "${existingRule.name}"). Please use a different configuration or edit the existing rule.`);
      return;
    }

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
  
  // Time fields should always be updated if provided
  if (availableTimeStart !== undefined) updateData.availableTimeStart = availableTimeStart;
  if (availableTimeEnd !== undefined) updateData.availableTimeEnd = availableTimeEnd;
  
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
    // Get the current rule first
    const currentRule = await prisma.enhancementRule.findUnique({
      where: { id }
    });

    if (!currentRule) {
      responseHandler(res, 404, "Rule not found");
      return;
    }

    // Merge current rule data with update data to get final state
    const finalRuleData = {
      ...currentRule,
      ...updateData
    };

    // Check for duplicate rule (excluding the current rule being updated and ignoring name)
    const whereConditions: any[] = [
      { id: { not: id } }, // Exclude current rule
      { enhancementId: finalRuleData.enhancementId },
      { availabilityType: finalRuleData.availabilityType },
      { availableTimeStart: finalRuleData.availableTimeStart },
      { availableTimeEnd: finalRuleData.availableTimeEnd },
      { roomScope: finalRuleData.roomScope }
    ];

    if (finalRuleData.availabilityType === 'WEEKLY') {
      whereConditions.push({
        availableDays: {
          equals: finalRuleData.availableDays
        }
      });
    }

    if (finalRuleData.availabilityType === 'SPECIFIC_DATES') {
      whereConditions.push({
        specificDates: {
          equals: finalRuleData.specificDates
        }
      });
    }

    if (finalRuleData.availabilityType === 'SEASONAL') {
      whereConditions.push({ seasonal: finalRuleData.seasonal });
      whereConditions.push({ seasonStart: finalRuleData.seasonStart });
      whereConditions.push({ seasonEnd: finalRuleData.seasonEnd });
    }

    if (finalRuleData.roomScope === 'SPECIFIC_ROOMS') {
      whereConditions.push({
        roomIds: {
          equals: finalRuleData.roomIds
        }
      });
    }

    // Add validity period to check
    if (finalRuleData.validFrom) {
      whereConditions.push({ validFrom: finalRuleData.validFrom });
    }
    if (finalRuleData.validUntil) {
      whereConditions.push({ validUntil: finalRuleData.validUntil });
    }

    const duplicateRule = await prisma.enhancementRule.findFirst({
      where: {
        AND: whereConditions
      }
    });

    if (duplicateRule) {
      responseHandler(res, 400, `A rule with identical settings already exists for this enhancement (Rule: "${duplicateRule.name}"). Please use a different configuration.`);
      return;
    }

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
