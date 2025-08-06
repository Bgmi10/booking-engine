import axios, { AxiosInstance } from 'axios';
import prisma from '../prisma';


interface Beds24RoomMapping {
  localRoomId: string;
  beds24RoomId: string;
  isActive: boolean;
}

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
    
    console.log('Beds24Service initialized with:', {
      apiKey: this.apiKey ? '***configured***' : 'NOT SET',
      propertyId: this.propertyId,
      propKey: this.propKey ? '***configured***' : 'NOT SET'
    });
  
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
   * Test connection to Beds24 API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.post('/json/getProperties', {
        authentication: {
          apiKey: this.apiKey
        }
      });

      const data = response.data;
      console.log('Beds24 connection test response:', data);

      // Check if we got a valid response
      return response.status === 200 && data && !data.error;
    } catch (error) {
      console.error('Beds24 connection test failed:', error);
      return false;
    }
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
  async syncRatesAndAvailability(startDate: Date, endDate: Date): Promise<boolean> {
    try {
      const roomMappings = await prisma.beds24RoomMapping.findMany({
        where: {
          isActive: true
        },
        include: {
          room: {
            include: {
              rateDatePrices: {
                where: {
                  date: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            }
          }
        }
      });

      if (roomMappings.length === 0) {
        console.log('No active room mappings found. Please map rooms first.');
        return false;
      }

      const rates: Beds24Rate[] = [];

      // For each mapped room, calculate rates and availability
      for (const mapping of roomMappings) {
        const room = mapping.room;

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Find specific rate for this date or use base price
          const specificRate = room.rateDatePrices.find(rdp => 
            rdp.date.toISOString().split('T')[0] === dateStr && rdp.isActive
          );
          
          let rate = specificRate ? specificRate.price : room.price;
          
          // Apply markup if configured
          if (mapping.markupPercent && mapping.markupPercent > 0) {
            rate = rate * (1 + mapping.markupPercent / 100);
          }
          
          // Check availability
          const isAvailable = await this.checkRoomAvailability(room.id, currentDate);
          
          rates.push({
            roomId: mapping.beds24RoomId,
            date: dateStr,
            rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
            minStay: mapping.minStay || 1,
            maxStay: mapping.maxStay || 30,
            available: isAvailable ? 1 : 0,
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
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
  async createRoomMapping(localRoomId: string, beds24RoomId: string, beds24RoomName?: string): Promise<boolean> {
    try {
      console.log(`Creating room mapping: Local ${localRoomId} <-> Beds24 ${beds24RoomId}`);
      
      // Check if mapping already exists
      const existingMapping = await prisma.beds24RoomMapping.findUnique({
        where: { localRoomId }
      });

      if (existingMapping) {
        // Update existing mapping
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

      return true;
    } catch (error) {
      console.error('Failed to create room mapping:', error);
      return false;
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
}

export default new Beds24Service();