import { Request, Response } from 'express';
import beds24Service from '../services/beds24Service';
import { responseHandler, handleError } from '../utils/helper';
import {
  syncRatesAvailabilitySchema,
  pushRatesSchema,
  getBeds24BookingsSchema,
  bulkSyncSchema,
  checkRoomAvailabilitySchema,
  createBeds24RoomMappingSchema,
  updateBeds24RoomMappingSchema,
} from '../zod/beds24.schema';

export class Beds24Controller {
  /**
   * Test connection to Beds24 API
   */
  async testConnection(req: Request, res: Response) {
    try {
      const isConnected = await beds24Service.testConnection();
      
      if (isConnected) {
        responseHandler(res, 200, 'Beds24 connection successful', { connected: true });
      } else {
        responseHandler(res, 400, 'Beds24 connection failed', { connected: false });
      }
    } catch (error: any) {
      console.error('Error testing Beds24 connection:', error);
      handleError(res, error);
    }
  }

  /**
   * Get property information from Beds24
   */
  async getPropertyInfo(req: Request, res: Response) {
    try {
      const propertyInfo = await beds24Service.getPropertyInfo();
      
      if (!propertyInfo) {
        return responseHandler(res, 404, 'Property not found or access denied');
      }

      responseHandler(res, 200, 'Property information retrieved successfully', propertyInfo);
    } catch (error: any) {
      console.error('Error fetching property info:', error);
      handleError(res, error);
    }
  }

  /**
   * Get all rooms from Beds24
   */
  async getBeds24Rooms(req: Request, res: Response) {
    try {
      const rooms = await beds24Service.getBeds24Rooms();
      responseHandler(res, 200, 'Beds24 rooms retrieved successfully', rooms);
    } catch (error: any) {
      console.error('Error fetching Beds24 rooms:', error);
      handleError(res, error);
    }
  }

  /**
   * Sync rates and availability to Beds24
   */
  async syncRatesAndAvailability(req: Request, res: Response) {
    try {
      const validatedData = syncRatesAvailabilitySchema.parse(req.body);
      
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      
      // Validate date range (max 90 days for performance)
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 90) {
        return responseHandler(res, 400, 'Date range cannot exceed 90 days');
      }

      if (startDate >= endDate) {
        return responseHandler(res, 400, 'Start date must be before end date');
      }

      const success = await beds24Service.syncRatesAndAvailability(startDate, endDate);
      
      if (success) {
        responseHandler(res, 200, 'Rates and availability synced successfully', {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          daysSynced: Math.ceil(daysDiff),
        });
      } else {
        responseHandler(res, 500, 'Failed to sync rates and availability');
      }
    } catch (error: any) {
      console.error('Error syncing rates and availability:', error);
      handleError(res, error);
    }
  }

  /**
   * Manually push specific rates to Beds24
   */
  async pushRates(req: Request, res: Response) {
    try {
      const validatedData = pushRatesSchema.parse(req.body);
      
      const success = await beds24Service.pushRatesAndAvailability(validatedData.rates);
      
      if (success) {
        responseHandler(res, 200, `Successfully pushed ${validatedData.rates.length} rates to Beds24`, {
          ratesPushed: validatedData.rates.length,
        });
      } else {
        responseHandler(res, 500, 'Failed to push rates to Beds24');
      }
    } catch (error: any) {
      console.error('Error pushing rates:', error);
      handleError(res, error);
    }
  }

  /**
   * Get bookings from Beds24
   */
  async getBookings(req: Request, res: Response) {
    try {
      const { startDate, endDate } = getBeds24BookingsSchema.parse(req.query);
      
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const bookings = await beds24Service.getBookings(start, end);
      
      responseHandler(res, 200, 'Beds24 bookings retrieved successfully', {
        count: bookings.length,
        bookings,
      });
    } catch (error: any) {
      console.error('Error fetching Beds24 bookings:', error);
      handleError(res, error);
    }
  }

  /**
   * Process webhook from Beds24 for new/updated bookings
   */
  async processBookingWebhook(req: Request, res: Response) {
    try {
      const beds24Booking = req.body;
      
      console.log('Received Beds24 booking webhook:', beds24Booking);
      
      const localBooking = await beds24Service.processIncomingBooking(beds24Booking);
      
      responseHandler(res, 200, 'Beds24 booking processed successfully', {
        beds24BookId: beds24Booking.bookId,
        localBookingId: localBooking.id,
        status: 'processed',
      });
    } catch (error: any) {
      console.error('Error processing Beds24 booking webhook:', error);
      // Return 200 to Beds24 even on error to prevent retries, but log the error
      responseHandler(res, 200, 'Webhook received but processing failed', {
        error: error.message,
        status: 'error',
      });
    }
  }

  /**
   * Bulk sync operation for rates, availability, or both
   */
  async bulkSync(req: Request, res: Response) {
    try {
      const validatedData = bulkSyncSchema.parse(req.body);
      
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      
      // Validate date range
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return responseHandler(res, 400, 'Date range cannot exceed 365 days for bulk sync');
      }

      if (validatedData.dryRun) {
        return responseHandler(res, 200, 'Dry run completed - no data was actually pushed to Beds24', {
          operation: validatedData.operation,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          dayCount: Math.ceil(daysDiff),
          dryRun: true,
        });
      }

      // For now, we'll only support full sync (both rates and availability)
      const success = await beds24Service.syncRatesAndAvailability(startDate, endDate);
      
      responseHandler(res, success ? 200 : 500, 
        success ? 'Bulk sync completed successfully' : 'Bulk sync failed', {
        operation: validatedData.operation,
        success,
        daysSynced: success ? Math.ceil(daysDiff) : 0,
      });
    } catch (error: any) {
      console.error('Error in bulk sync:', error);
      handleError(res, error);
    }
  }

  /**
   * Get all room mappings
   */
  async getRoomMappings(req: Request, res: Response) {
    try {
      const mappings = await beds24Service.getRoomMappings();
      responseHandler(res, 200, 'Room mappings retrieved successfully', mappings);
    } catch (error: any) {
      console.error('Error fetching room mappings:', error);
      handleError(res, error);
    }
  }

  /**
   * Create room mapping between local room and Beds24 room
   */
  async createRoomMapping(req: Request, res: Response) {
    try {
      const validatedData = createBeds24RoomMappingSchema.parse(req.body);
      
      const success = await beds24Service.createRoomMapping(
        validatedData.localRoomId,
        validatedData.beds24RoomId,
        'Double Room' // Add the room name
      );
      
      if (success) {
        responseHandler(res, 201, 'Room mapping created successfully', validatedData);
      } else {
        responseHandler(res, 500, 'Failed to create room mapping');
      }
    } catch (error: any) {
      console.error('Error creating room mapping:', error);
      handleError(res, error);
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(req: Request, res: Response) {
    try {
      // This is a placeholder - you might want to implement actual sync status tracking
      const status = {
        lastSyncTime: null,
        nextSyncTime: null,
        syncFrequency: '1 hour',
        autoSyncEnabled: false,
        connectionStatus: await beds24Service.testConnection(),
        totalRoomsMapped: 1, // Placeholder
        recentSyncResults: [],
      };

      responseHandler(res, 200, 'Sync status retrieved successfully', status);
    } catch (error: any) {
      console.error('Error fetching sync status:', error);
      handleError(res, error);
    }
  }

  /**
   * Get dashboard statistics for Beds24 integration
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      // Get recent bookings count
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentBookings = await beds24Service.getBookings(thirtyDaysAgo, new Date());
      
      const stats = {
        totalBookingsLast30Days: recentBookings.length,
        connectionStatus: await beds24Service.testConnection(),
        lastSyncTime: null, // You might want to track this in database
        pendingBookings: recentBookings.filter(b => b.status === '0').length,
        confirmedBookings: recentBookings.filter(b => b.status === '1').length,
        totalRevenue: recentBookings.reduce((sum, b) => sum + b.price, 0),
      };

      responseHandler(res, 200, 'Dashboard statistics retrieved successfully', stats);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      handleError(res, error);
    }
  }
}

export default new Beds24Controller();