import { Request, Response } from 'express';
import beds24Service from '../services/beds24Service';
import { responseHandler, handleError } from '../utils/helper';
import {
  syncRatesAvailabilitySchema,
  pushRatesSchema,
  getBeds24BookingsSchema,
  bulkSyncSchema,
} from '../zod/beds24.schema';
import prisma from '../prisma';

export class Beds24Controller {

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

      const success = await beds24Service.syncRatesAndAvailability(startDate, endDate, {
        applyToFutureDates: validatedData.applyToFutureDates,
        roomMappings: validatedData.roomMappings,
        markupPercent: validatedData.markupPercent,
        minStay: validatedData.minStay,
        maxStay: validatedData.maxStay
      });
      
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
        connectionStatus: true, // Connection is established
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
        totalBookingsLast30Days: Array.isArray(recentBookings) ? recentBookings.length : 0,
        connectionStatus: true, // Connection is established
        lastSyncTime: null, // You might want to track this in database
        pendingBookings: Array.isArray(recentBookings) ? recentBookings.filter(b => b.status === '0').length : 0,
        confirmedBookings: Array.isArray(recentBookings) ? recentBookings.filter(b => b.status === '1').length : 0,
        totalRevenue: Array.isArray(recentBookings) ? recentBookings.reduce((sum, b) => sum + b.price, 0) : 0,
      };

      responseHandler(res, 200, 'Dashboard statistics retrieved successfully', stats);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      handleError(res, error);
    }
  }

  /**
   * Sync booking restrictions to Beds24
   */
  async syncBookingRestrictions(req: Request, res: Response) {
    try {
      const validatedData = syncRatesAvailabilitySchema.parse(req.body); // Using same schema for date validation
      
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      
      // Validate date range (max 90 days for performance)
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 90) {
        return responseHandler(res, 400, 'Date range cannot exceed 90 days for restrictions sync');
      }

      if (startDate >= endDate) {
        return responseHandler(res, 400, 'Start date must be before end date');
      }

      const success = await beds24Service.syncBookingRestrictions(
        startDate, 
        endDate, 
        validatedData.roomMappings || []
      );
      
      if (success) {
        responseHandler(res, 200, 'Booking restrictions synced successfully to Beds24', {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          daysSynced: Math.ceil(daysDiff),
        });
      } else {
        responseHandler(res, 500, 'Failed to sync booking restrictions to Beds24');
      }
    } catch (error: any) {
      console.error('Error syncing booking restrictions:', error);
      handleError(res, error);
    }
  }
  /**
   * Create or update room mapping
   */
  async createRoomMapping(req: Request, res: Response) {
    try {
      const { localRoomId, beds24RoomId, isActive = true, autoSync = true } = req.body;

      if (!localRoomId || !beds24RoomId) {
        return responseHandler(res, 400, 'localRoomId and beds24RoomId are required');
      }

      // Check if room exists
      const room = await prisma.room.findUnique({
        where: { id: localRoomId }
      });

      if (!room) {
        return responseHandler(res, 404, 'Local room not found');
      }

      // Create or update mapping
      const mapping = await prisma.beds24RoomMapping.upsert({
        where: { localRoomId },
        update: {
          beds24RoomId,
          isActive,
          autoSync,
          syncStatus: 'PENDING'
        },
        create: {
          localRoomId,
          beds24RoomId,
          isActive,
          autoSync,
          syncStatus: 'PENDING'
        }
      });

      // Mark room for sync
      await prisma.room.update({
        where: { id: localRoomId },
        data: { needsChannelSync: true }
      });

      responseHandler(res, 200, 'Room mapping created/updated successfully', mapping);
    } catch (error: any) {
      console.error('Error creating room mapping:', error);
      handleError(res, error);
    }
  }

  /**
   * Mark all mapped rooms for sync (debug endpoint)
   */
  async markAllRoomsForSync(req: Request, res: Response) {
    try {
      const result = await prisma.room.updateMany({
        where: {
          beds24Mapping: {
            isActive: true
          }
        },
        data: {
          needsChannelSync: true,
          channelSyncFailCount: 0
        }
      });

      responseHandler(res, 200, `Marked ${result.count} rooms for sync`, {
        roomsMarked: result.count
      });
    } catch (error: any) {
      console.error('Error marking rooms for sync:', error);
      handleError(res, error);
    }
  }

  /**
   * Get rate policy mappings for a Beds24 room mapping
   */
  async getRatePolicyMappings(req: Request, res: Response) {
    try {
      const { mappingId } = req.params;

      const mappings = await prisma.beds24RatePolicyMapping.findMany({
        where: { beds24RoomMappingId: mappingId },
        include: {
          ratePolicy: {
            select: {
              id: true,
              name: true,
              description: true,
              basePrice: true,
              isActive: true
            }
          }
        },
        orderBy: [
          { priceSlot: 'asc' },
          { priority: 'desc' }
        ]
      });

      responseHandler(res, 200, 'Rate policy mappings fetched successfully', mappings);
    } catch (error: any) {
      console.error('Error fetching rate policy mappings:', error);
      handleError(res, error);
    }
  }

  /**
   * Create or update rate policy mappings for a Beds24 room
   */
  async upsertRatePolicyMappings(req: Request, res: Response) {
    try {
      const { mappingId } = req.params;
      const { mappings } = req.body;

      if (!Array.isArray(mappings)) {
        return responseHandler(res, 400, 'Mappings must be an array');
      }

      // Validate that mapping exists
      const beds24Mapping = await prisma.beds24RoomMapping.findUnique({
        where: { id: mappingId }
      });

      if (!beds24Mapping) {
        return responseHandler(res, 404, 'Beds24 room mapping not found');
      }

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Delete existing mappings
        await tx.beds24RatePolicyMapping.deleteMany({
          where: { beds24RoomMappingId: mappingId }
        });

        // Create new mappings
        const createdMappings = [];
        for (const mapping of mappings) {
          if (!mapping.ratePolicyId || mapping.priceSlot === undefined) {
            continue;
          }

          const created = await tx.beds24RatePolicyMapping.create({
            data: {
              beds24RoomMappingId: mappingId,
              ratePolicyId: mapping.ratePolicyId,
              priceSlot: mapping.priceSlot,
              markupPercent: mapping.markupPercent || null,
              channelRateCode: mapping.channelRateCode || null,
              priority: mapping.priority || 0,
              isActive: mapping.isActive !== false
            },
            include: {
              ratePolicy: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  basePrice: true
                }
              }
            }
          });
          createdMappings.push(created);
        }

        // Mark room for sync
        await tx.beds24RoomMapping.update({
          where: { id: mappingId },
          data: { needsSync: true }
        });

        // Also mark the room itself for sync
        await tx.room.update({
          where: { id: beds24Mapping.localRoomId },
          data: { needsChannelSync: true }
        });

        return createdMappings;
      });

      responseHandler(res, 200, 'Rate policy mappings updated successfully', result);
    } catch (error: any) {
      console.error('Error updating rate policy mappings:', error);
      handleError(res, error);
    }
  }

  /**
   * Delete a specific rate policy mapping
   */
  async deleteRatePolicyMapping(req: Request, res: Response) {
    try {
      const { mappingId, ratePolicyMappingId } = req.params;

      const deleted = await prisma.beds24RatePolicyMapping.delete({
        where: {
          id: ratePolicyMappingId,
          beds24RoomMappingId: mappingId
        }
      });

      // Mark for sync
      await prisma.beds24RoomMapping.update({
        where: { id: mappingId },
        data: { needsSync: true }
      });

      responseHandler(res, 200, 'Rate policy mapping deleted successfully', deleted);
    } catch (error: any) {
      console.error('Error deleting rate policy mapping:', error);
      handleError(res, error);
    }
  }
}

export default new Beds24Controller();