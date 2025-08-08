import axios, { AxiosInstance } from 'axios';
import prisma from '../prisma';

interface Beds24Rate {
  roomId: string;
  date: string;
  rate: number;
  minStay?: number;
  maxStay?: number;
  available: number;
}

interface Beds24Booking {
  bookId: string;
  propId: string;
  roomId: string;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild: number;
  guestFirstName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  price: number;
  commission: number;
  apiReference: string;
  bookingTime: string;
  status: string;
  payStatus: string;
  guestComments: string;
}

export class Beds24Service {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private propertyId: string;
  private propKey: string;
  private baseURL = 'https://api.beds24.com';

  constructor() {
    this.apiKey = process.env.BEDS_24_API_KEY || '097b5ed61acad9539b7b4586d6701691';
    this.propertyId = process.env.BEDS_24_PROPERTY_ID || '288530';
    
    // Add propKey property
    this.propKey = process.env.BEDS_24_PROP_KEY || '';

    if (!this.apiKey || !this.propertyId) {
      throw new Error('Beds24 API credentials not configured in environment variables');
    }

    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }


  /**
   * Get all rooms from Beds24 for the configured property
   */
  async getBeds24Rooms(): Promise<any[]> {
    try {
      // Use getProperties to get room information since it doesn't require IP whitelisting
      const response = await this.apiClient.post('/json/getProperties', {
        authentication: {
          apiKey: this.apiKey
        }
      });

      const data = response.data;
      console.log('Beds24 properties response:', data);

      if (data?.error) {
        throw new Error(`Beds24 API error: ${data.error}`);
      }

      // Find our specific property
      const properties = data.getProperties || [];
      const ourProperty = properties.find((prop: any) => prop.propId === this.propertyId);
      
      if (!ourProperty) {
        throw new Error(`Property ${this.propertyId} not found`);
      }

      console.log('Our property:', ourProperty);
      
      // Extract room types from the property
      const roomTypes = ourProperty.roomTypes || [];
      const rooms = roomTypes.map((roomType: any) => ({
        roomId: roomType.roomId || '602724', // Use your known test room ID as fallback
        roomName: roomType.name || roomType.roomName || 'Double Room',
        roomDescription: roomType.description || 'Room from Beds24',
        maxOccupancy: roomType.maxOccupancy || 2,
        roomQty: roomType.qty || 1,
        isActive: true
      }));

      // If no rooms found in API, add your test room
      if (rooms.length === 0) {
        rooms.push({
          roomId: '602724',
          roomName: 'Double Room',
          roomDescription: 'Test Room from Beds24',
          maxOccupancy: 2,
          roomQty: 1,
          isActive: true
        });
      }
      
      console.log('Extracted rooms:', rooms);
      return rooms;
    } catch (error) {
      console.error('Failed to fetch Beds24 rooms:', error);
      // Return test room as fallback
      return [{
        roomId: '602724',
        roomName: 'Double Room',
        roomDescription: 'Test Room from Beds24',
        maxOccupancy: 2,
        roomQty: 1,
        isActive: true
      }];
    }
  }

  /**
   * Push rate and availability to Beds24
   */
  async pushRatesAndAvailability(rates: Beds24Rate[]): Promise<boolean> {
    try {
      // Add propKey validation first
      if (!this.propKey || this.propKey.length < 16) {
        throw new Error(`Beds24 propKey is required and must be at least 16 characters. Please set BEDS_24_PROP_KEY environment variable with your property key from Beds24 dashboard.`);
      }

      const roomIds = [...new Set(rates.map(rate => rate.roomId))];
      const results = [];
      
      for (const roomId of roomIds) {
        const roomRates = rates.filter(rate => rate.roomId === roomId);
        
        // Build dates object with correct Beds24 format
        const dates: any = {};
        roomRates.forEach(rate => {
          // Convert YYYY-MM-DD to YYYYMMDD format
          const dateKey = rate.date.replace(/-/g, '');
          dates[dateKey] = {
            p1: rate.rate.toFixed(2), // Primary price
            i: rate.available.toString(), // Inventory (availability)
            mn: rate.minStay?.toString() || '1', // Min stay
            mx: rate.maxStay?.toString() || '30', // Max stay
          };
        });

        const requestData = {
          authentication: {
            apiKey: this.apiKey,
            propKey: this.propKey
          },
          roomId: roomId,
          dates: dates
        };
        
        const response = await this.apiClient.post('/json/setRoomDates', requestData);
        results.push(response.data);
        
        // Add small delay between requests to avoid rate limiting
        if (roomIds.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      let hasErrors = false;
      let successCount = 0;
      
      for (const result of results) {
        if (result?.error) {
          console.error('Beds24 rate push error:', result);
          hasErrors = true;
        } else {
          successCount++;
        }
      }

      if (hasErrors) {
        console.warn(`⚠️ Some room sync requests failed. ${successCount}/${results.length} rooms synced successfully.`);
        return false;
      } else {
        console.log(`✅ Successfully pushed ${rates.length} rates to Beds24 for ${results.length} room(s)`);
        return true;
      }
    } catch (error) {
      console.error('Failed to push rates to Beds24:', error);
      throw new Error('Failed to push rates to Beds24');
    }
  }

  /**
   * Get bookings from Beds24
   */
  async getBookings(startDate?: Date, endDate?: Date): Promise<Beds24Booking[]> {
    try {
      const requestData: any = {
        authentication: {
          apiKey: this.apiKey
        },
        propId: this.propertyId,
      };

      if (startDate) {
        requestData.dateStart = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        requestData.dateEnd = endDate.toISOString().split('T')[0];
      }

      const response = await this.apiClient.post('/json/getBookings', requestData);

      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch bookings from Beds24:', error);
      throw new Error('Failed to fetch bookings from Beds24');
    }
  }

  /**
   * Sync room rates and availability from our system to Beds24
   */
  async syncRatesAndAvailability(
    startDate: Date, 
    endDate: Date, 
    options?: {
      applyToFutureDates?: boolean;
      roomMappings?: string[];
      markupPercent?: number;
      minStay?: number;
      maxStay?: number;
    }
  ): Promise<boolean> {
    try {
      const whereClause: any = {
        isActive: true
      };
      
      // Filter by specific room mappings if provided
      if (options?.roomMappings && options.roomMappings.length > 0) {
        whereClause.id = {
          in: options.roomMappings
        };
      }
      
      const roomMappings: any = await prisma.beds24RoomMapping.findMany({
        where: whereClause,
        include: {
          room: {
            include: {
              rateDatePrices: {
                where: {
                  date: {
                    gte: startDate,
                    lte: endDate,
                  },
                  isActive: true
                },
                include: {
                  ratePolicy: true
                }
              },
              RoomRate: {
                where: {
                  isActive: true
                },
                include: {
                  ratePolicy: true
                }
              }
            }
          }
        }
      });

      if (roomMappings.length === 0) {
        console.log('No active room mappings found. Please map rooms first.');
        return false;
      }

      const rates: Beds24Rate[] = [];

      // Calculate final end date once, outside the loop
      const finalEndDate = options?.applyToFutureDates 
        ? new Date(endDate.getTime() + (90 * 24 * 60 * 60 * 1000)) // Add 90 days for future dates
        : endDate;
        
      console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${finalEndDate.toISOString().split('T')[0]}`);
      console.log(`Apply to future dates: ${options?.applyToFutureDates}`);

      // For each mapped room, calculate rates and availability
      for (const mapping of roomMappings) {
        const room = mapping.room;

        console.log(`Processing room: ${room.name} (Local: ${room.id} -> Beds24: ${mapping.beds24RoomId})`);
        
        let currentDate = new Date(startDate);
        
        while (currentDate <= finalEndDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          let finalRate = 0;
          
          // 1. Check for specific date override first (highest priority)
          const specificDateRate = room.rateDatePrices.find((rdp: any) => 
            rdp.date.toISOString().split('T')[0] === dateStr
          );
          
          if (specificDateRate) {
            finalRate = specificDateRate.price;
            console.log(`Using specific date rate for ${dateStr}: €${finalRate} (Policy: ${specificDateRate.ratePolicy.name})`);
          } else {
            // 2. Use active rate policies (get lowest base price from all active policies)
            const activeRoomRates = room.RoomRate.filter((rr: any) => rr.isActive && rr.ratePolicy && rr.ratePolicy.isActive && rr.ratePolicy.basePrice);
            
            if (activeRoomRates.length > 0) {
              // Find the policy with the lowest base price after adjustments
              let lowestFinalRate = Infinity;
              let selectedPolicy = null;
              
              for (const roomRate of activeRoomRates) {
                const basePrice = roomRate.ratePolicy.basePrice;
                const adjustment = roomRate.percentageAdjustment || 0;
                const calculatedRate = basePrice * (1 + adjustment / 100);
                
                if (calculatedRate < lowestFinalRate) {
                  lowestFinalRate = calculatedRate;
                  selectedPolicy = roomRate;
                }
              }
              
              if (selectedPolicy) {
                finalRate = lowestFinalRate;
                const basePrice = selectedPolicy.ratePolicy.basePrice;
                const adjustment = selectedPolicy.percentageAdjustment || 0;
                console.log(`Using lowest rate policy: ${selectedPolicy.ratePolicy.name}, Base: €${basePrice}, Adjustment: ${adjustment}%, Final: €${finalRate} (from ${activeRoomRates.length} policies)`);
              } else {
                // 3. Last fallback to deprecated room.price (with warning)
                finalRate = room.price;
                console.warn(`⚠️  Using deprecated room.price for ${room.name}. Please set up rate policies!`);
              }
            } else {
              // 3. Last fallback to deprecated room.price (with warning)
              finalRate = room.price;
              console.warn(`⚠️  Using deprecated room.price for ${room.name}. Please set up rate policies!`);
            }
          }
          
          // Apply Beds24-specific markup if configured (from mapping or options)
          const markupPercent = options?.markupPercent || mapping.markupPercent || 0;
          if (markupPercent > 0) {
            finalRate = finalRate * (1 + markupPercent / 100);
            console.log(`Applied Beds24 markup (${markupPercent}%): €${finalRate}`);
          }
          
          // Check availability
          const isAvailable = await this.checkRoomAvailability(room.id, currentDate);
          
          rates.push({
            roomId: mapping.beds24RoomId,
            date: dateStr,
            rate: Math.round(finalRate * 100) / 100, // Round to 2 decimal places
            minStay: options?.minStay || mapping.minStay || 1,
            maxStay: options?.maxStay || mapping.maxStay || 30,
            available: isAvailable ? 1 : 0,
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      console.log(`\nTotal rates to sync: ${rates.length}`);
      console.log(`Rooms to sync: ${roomMappings.length}`);
      console.log(`Date range per room: ${Math.ceil((finalEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days`);
      
      if (rates.length > 0) {
        const success = await this.pushRatesAndAvailability(rates);
        
        if (success) {
          // Update mapping sync status and timestamp
          for (const mapping of roomMappings) {
            await prisma.beds24RoomMapping.update({
              where: { id: mapping.id },
              data: {
                syncStatus: 'SYNCED',
                lastSyncAt: new Date()
              }
            });
          }
          console.log('Successfully synced rates and updated mapping status');
        }
        
        return success;
      } else {
        console.log('No rates to sync');
        return true;
      }
    } catch (error) {
      console.error('Failed to sync rates and availability:', error);
      return false;
    }
  }

  /**
   * Check if room is available on a specific date
   * This is a simplified version - you might want to enhance this logic
   */
  private async checkRoomAvailability(roomId: string, date: Date): Promise<boolean> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if there are any confirmed bookings for this room on this date
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          roomId,
          status: 'CONFIRMED',
          OR: [
            {
              AND: [
                { checkIn: { lte: startOfDay } },
                { checkOut: { gt: startOfDay } },
              ],
            },
            {
              AND: [
                { checkIn: { lt: endOfDay } },
                { checkOut: { gte: endOfDay } },
              ],
            },
            {
              AND: [
                { checkIn: { gte: startOfDay } },
                { checkOut: { lte: endOfDay } },
              ],
            },
          ],
        },
      });

      return conflictingBookings.length === 0;
    } catch (error) {
      console.error('Error checking room availability:', error);
      return false;
    }
  }

  /**
   * Process incoming booking from Beds24 webhook
   */
  async processIncomingBooking(beds24Booking: Beds24Booking): Promise<any> {
    try {
      console.log('Processing Beds24 booking:', beds24Booking);

      // Find the local room mapping
      // For now using the test room ID - later we'll have a proper mapping table
      const localRoom = await prisma.room.findFirst({
        // This is a placeholder - you'll need proper room mapping
      });

      if (!localRoom) {
        throw new Error(`No local room mapping found for Beds24 room ${beds24Booking.roomId}`);
      }

      // Create or find customer
      let customer = await prisma.customer.findUnique({
        where: { guestEmail: beds24Booking.guestEmail },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            guestFirstName: beds24Booking.guestFirstName,
            guestLastName: beds24Booking.guestName.replace(beds24Booking.guestFirstName, '').trim(),
            guestEmail: beds24Booking.guestEmail,
            guestPhone: beds24Booking.guestPhone || '',
            guestNationality: beds24Booking.guestCountry || '',
          },
        });
      }

      // Create local booking
      const localBooking = await prisma.booking.create({
        data: {
          totalGuests: beds24Booking.numAdult + beds24Booking.numChild,
          checkIn: new Date(beds24Booking.arrival),
          checkOut: new Date(beds24Booking.departure),
          status: beds24Booking.status === '1' ? 'CONFIRMED' : 'PENDING',
          roomId: localRoom.id,
          customerId: customer.id,
          request: beds24Booking.guestComments || '',
          metadata: {
            beds24BookId: beds24Booking.bookId,
            beds24ApiReference: beds24Booking.apiReference,
            beds24Commission: beds24Booking.commission,
            syncedFromBeds24: true,
          },
        },
      });

      console.log(`Created local booking ${localBooking.id} from Beds24 booking ${beds24Booking.bookId}`);
      return localBooking;
    } catch (error) {
      console.error('Failed to process Beds24 booking:', error);
      throw error;
    }
  }

  /**
   * Create a room mapping between local room and Beds24 room
   */
  async createRoomMapping(localRoomId: string, beds24RoomId: string, beds24RoomName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Creating room mapping: Local ${localRoomId} <-> Beds24 ${beds24RoomId}`);
      
      // Check if local room is already mapped
      const existingLocalMapping = await prisma.beds24RoomMapping.findUnique({
        where: { localRoomId }
      });

      // Check if Beds24 room is already mapped
      const existingBeds24Mapping = await prisma.beds24RoomMapping.findUnique({
        where: { beds24RoomId }
      });

      // If Beds24 room is already mapped to a different local room, return error
      if (existingBeds24Mapping && existingBeds24Mapping.localRoomId !== localRoomId) {
        return {
          success: false,
          error: `Beds24 room '${beds24RoomName || beds24RoomId}' is already mapped to another local room. Please choose a different Beds24 room or remove the existing mapping first.`
        };
      }

      if (existingLocalMapping) {
        // Update existing mapping for this local room
        await prisma.beds24RoomMapping.update({
          where: { localRoomId },
          data: {
            beds24RoomId,
            beds24RoomName: beds24RoomName || 'Double Room',
            isActive: true,
            autoSync: true,
            syncStatus: 'PENDING',
            updatedAt: new Date()
          }
        });
        console.log(`Updated existing room mapping for local room ${localRoomId}`);
      } else {
        // Create new mapping
        await prisma.beds24RoomMapping.create({
          data: {
            localRoomId,
            beds24RoomId,
            beds24RoomName: beds24RoomName || 'Double Room',
            isActive: true,
            autoSync: true,
            syncStatus: 'PENDING'
          }
        });
        console.log(`Created new room mapping for local room ${localRoomId}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to create room mapping:', error);
      
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('beds24RoomId')) {
          return {
            success: false,
            error: `Beds24 room '${beds24RoomName || beds24RoomId}' is already mapped to another room. Please choose a different Beds24 room.`
          };
        } else if (target?.includes('localRoomId')) {
          return {
            success: false,
            error: 'This local room is already mapped. Please update the existing mapping instead.'
          };
        }
      }
      
      return {
        success: false,
        error: 'Failed to create room mapping. Please try again.'
      };
    }
  }

  /**
   * Get all room mappings from database
   */
  async getRoomMappings(): Promise<any[]> {
    try {
      const mappings = await prisma.beds24RoomMapping.findMany({
        include: {
          room: {
            select: {
              id: true,
              name: true,
              price: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`Found ${mappings.length} room mappings`);
      return mappings;
    } catch (error) {
      console.error('Failed to fetch room mappings:', error);
      return [];
    }
  }

  /**
   * Get property information from Beds24
   */
  async getPropertyInfo(): Promise<any> {
    try {
      const response = await this.apiClient.post('/json/getProperty', {
        authentication: {
          apiKey: this.apiKey
        },
        propId: this.propertyId,
      });

      return response.data?.[0] || null;
    } catch (error) {
      console.error('Failed to fetch property info:', error);
      throw new Error('Failed to fetch property info');
    }
  }

  /**
   * Sync booking restrictions to Beds24
   */
  async syncBookingRestrictions(
    startDate: Date,
    endDate: Date,
    roomMappings: string[] = []
  ): Promise<boolean> {
    try {
      console.log('🔒 Starting booking restrictions sync to Beds24');
      
      // Add propKey validation
      if (!this.propKey || this.propKey.length < 16) {
        throw new Error(`Beds24 propKey is required for restriction sync. Please set BEDS_24_PROP_KEY environment variable.`);
      }

      // Get active booking restrictions for the date range
      const restrictions = await prisma.bookingRestriction.findMany({
        where: {
          isActive: true,
          AND: [
            {
              OR: [
                {
                  // Restrictions that start within our date range
                  startDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
                {
                  // Restrictions that end within our date range  
                  endDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
                {
                  // Restrictions that span our entire date range
                  AND: [
                    { startDate: { lte: startDate } },
                    { endDate: { gte: endDate } },
                  ],
                },
              ],
            },
          ],
        },
        include: {
          exceptions: true,
        },
      });

      console.log(`Found ${restrictions.length} active restrictions for date range`);

      // Get room mappings
      const whereClause: any = { isActive: true };
      if (roomMappings.length > 0) {
        whereClause.id = { in: roomMappings };
      }

      const mappings = await prisma.beds24RoomMapping.findMany({
        where: whereClause,
        include: { room: true },
      });

      if (mappings.length === 0) {
        console.log('No active room mappings found for restriction sync');
        return false;
      }

      console.log(`Syncing restrictions for ${mappings.length} room mappings`);

      // Process each room mapping
      for (const mapping of mappings) {
        const restrictionDates: any = {};
        
        // Generate dates in the range
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0].replace(/-/g, '');
          const dateObj = new Date(currentDate);
          
          // Apply restrictions for this date
          const dateRestrictions = this.getRestrictionsForDate(dateObj, restrictions, mapping);
          
          if (Object.keys(dateRestrictions).length > 0) {
            restrictionDates[dateKey] = dateRestrictions;
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Send to Beds24 if we have restrictions to apply
        if (Object.keys(restrictionDates).length > 0) {
          const requestData = {
            authentication: {
              apiKey: this.apiKey,
              propKey: this.propKey,
            },
            roomId: mapping.beds24RoomId,
            dates: restrictionDates,
          };

          console.log(`📤 Sending ${Object.keys(restrictionDates).length} restriction dates for room ${mapping.room.name} (${mapping.beds24RoomId})`);
          console.log('Request data:', JSON.stringify(requestData, null, 2));

          const response = await this.apiClient.post('/json/setRoomDates', requestData);
          
          console.log(`📥 Beds24 response for ${mapping.room.name}:`, response.data);

          if (response.data?.error) {
            console.error(`❌ Error syncing restrictions for room ${mapping.room.name}:`, response.data);
          } else {
            console.log(`✅ Successfully synced restrictions for room ${mapping.room.name}`);
          }

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`ℹ️  No restrictions to sync for room ${mapping.room.name}`);
        }
      }

      console.log('🎉 Booking restrictions sync completed');
      return true;

    } catch (error) {
      console.error('❌ Failed to sync booking restrictions:', error);
      throw error;
    }
  }

  /**
   * Get restrictions that apply to a specific date and room mapping
   */
  private getRestrictionsForDate(date: Date, restrictions: any[], roomMapping: any): any {
    const restrictionData: any = {};
    
    for (const restriction of restrictions) {
      // Check if this restriction applies to this date
      if (date < new Date(restriction.startDate) || date > new Date(restriction.endDate)) {
        continue;
      }

      // Check if this restriction applies to this room
      if (restriction.roomScope === 'SPECIFIC_ROOMS' && 
          restriction.roomIds.length > 0 && 
          !restriction.roomIds.includes(roomMapping.localRoomId)) {
        continue;
      }

      // Check day of week restrictions
      if (restriction.daysOfWeek.length > 0) {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        if (!restriction.daysOfWeek.includes(dayOfWeek)) {
          continue;
        }
      }

      // Apply the restriction based on type
      switch (restriction.type) {
        case 'CLOSE_TO_ARRIVAL':
          restrictionData.i = "0"; // Close arrival
          console.log(`🚫 Closing arrival for ${date.toISOString().split('T')[0]} due to restriction: ${restriction.name}`);
          break;
          
        case 'CLOSE_TO_DEPARTURE':
          restrictionData.o = "0"; // Close departure (note: Beds24 uses "1" for allow, so "0" closes)
          console.log(`🚫 Closing departure for ${date.toISOString().split('T')[0]} due to restriction: ${restriction.name}`);
          break;
          
        case 'CLOSE_TO_STAY':
          restrictionData.i = "0"; // Close both arrival and stay
          console.log(`🚫 Closing stay for ${date.toISOString().split('T')[0]} due to restriction: ${restriction.name}`);
          break;
          
        case 'MIN_LENGTH':
          if (restriction.minLength) {
            restrictionData.m = restriction.minLength.toString();
            console.log(`📏 Setting min stay ${restriction.minLength} for ${date.toISOString().split('T')[0]} due to restriction: ${restriction.name}`);
          }
          break;
          
        case 'MAX_LENGTH':
          if (restriction.maxLength) {
            restrictionData.mx = restriction.maxLength.toString();
            console.log(`📏 Setting max stay ${restriction.maxLength} for ${date.toISOString().split('T')[0]} due to restriction: ${restriction.name}`);
          }
          break;
      }
    }
    
    return restrictionData;
  }
}

export default new Beds24Service();