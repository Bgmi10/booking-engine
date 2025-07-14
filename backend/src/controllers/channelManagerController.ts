import { Request, Response } from 'express';
import channelManagerService from '../services/channelManagerService';
import prisma from '../prisma/index';
import { responseHandler, handleError } from '../utils/helper';
import { createChannelAvailabilitySchema, createChannelBookingSchema, createChannelManagerSchema, createChannelRateSchema, createChannelRoomSchema, updateChannelManagerSchema, updateChannelRoomSchema } from '../zod/channelManager.schema';

export class ChannelManagerController {
  // Channel Manager CRUD Operations
  async createChannelManager(req: Request, res: Response) {
    try {
      const validatedData = createChannelManagerSchema.parse(req.body);
      const channelManager = await channelManagerService.createChannelManager(validatedData);
      
      responseHandler(res, 201, 'Channel manager created successfully', channelManager);
    } catch (error: any) {
      console.error('Error creating channel manager:', error);
      handleError(res, error);
    }
  }

  async getAllChannelManagers(req: Request, res: Response) {
    try {
      const { active } = req.query;
      const channelManagers = active === 'true' 
        ? await channelManagerService.getActiveChannelManagers()
        : await channelManagerService.getAllChannelManagers();
      
      responseHandler(res, 200, 'Channel managers retrieved successfully', channelManagers);
    } catch (error: any) {
      console.error('Error fetching channel managers:', error);
      handleError(res, error);
    }
  }

  async getChannelManagerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const channelManager = await channelManagerService.getChannelManagerById(id);
      
      if (!channelManager) {
        res.status(404);
        handleError(res, new Error('Channel manager not found'));
        return;
      }
      
      responseHandler(res, 200, 'Channel manager retrieved successfully', channelManager);
    } catch (error: any) {
      console.error('Error fetching channel manager:', error);
      handleError(res, error);
    }
  }

  async updateChannelManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateChannelManagerSchema.parse(req.body);
      const channelManager = await channelManagerService.updateChannelManager(id, validatedData);
      
      responseHandler(res, 200, 'Channel manager updated successfully', channelManager);
    } catch (error: any) {
      console.error('Error updating channel manager:', error);
      handleError(res, error);
    }
  }

  async deleteChannelManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await channelManagerService.deleteChannelManager(id);
      
      responseHandler(res, 200, 'Channel manager deleted successfully');
    } catch (error: any) {
      console.error('Error deleting channel manager:', error);
      handleError(res, error);
    }
  }

  // Channel Room Operations
  async createChannelRoom(req: Request, res: Response) {
    try {
      const validatedData = createChannelRoomSchema.parse(req.body);
      const channelRoom = await channelManagerService.createChannelRoom(validatedData);
      
      responseHandler(res, 201, 'Channel room created successfully', channelRoom);
    } catch (error: any) {
      console.error('Error creating channel room:', error);
      handleError(res, error);
    }
  }

  async getChannelRooms(req: Request, res: Response) {
    try {
      const { channelId } = req.query;
      const channelRooms = await channelManagerService.getChannelRooms(channelId as string);
      
      responseHandler(res, 200, 'Channel rooms retrieved successfully', channelRooms);
    } catch (error: any) {
      console.error('Error fetching channel rooms:', error);
      handleError(res, error);
    }
  }

  async updateChannelRoom(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateChannelRoomSchema.parse(req.body);
      const channelRoom = await channelManagerService.updateChannelRoom(id, validatedData);
      
      responseHandler(res, 200, 'Channel room updated successfully', channelRoom);
    } catch (error: any) {
      console.error('Error updating channel room:', error);
      handleError(res, error);
    }
  }

  async deleteChannelRoom(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await channelManagerService.deleteChannelRoom(id);
      
      responseHandler(res, 200, 'Channel room deleted successfully');
    } catch (error: any) {
      console.error('Error deleting channel room:', error);
      handleError(res, error);
    }
  }

  async getRoomsAvailableForChannel(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const rooms = await channelManagerService.getRoomsAvailableForChannel(channelId);
      
      responseHandler(res, 200, 'Available rooms retrieved successfully', rooms);
    } catch (error: any) {
      console.error('Error fetching available rooms:', error);
      handleError(res, error);
    }
  }

  // Rate Distribution Operations
  async createChannelRate(req: Request, res: Response) {
    try {
      const validatedData = createChannelRateSchema.parse(req.body);
      const channelRate = await channelManagerService.createChannelRate(validatedData);
      
      responseHandler(res, 201, 'Channel rate created successfully', channelRate);
    } catch (error: any) {
      console.error('Error creating channel rate:', error);
      handleError(res, error);
    }
  }

  async updateChannelRates(req: Request, res: Response) {
    try {
      const { channelRoomId } = req.params;
      const { rates } = req.body;
      
      if (!Array.isArray(rates)) {
        res.status(400);
        handleError(res, new Error('Rates must be an array'));
        return;
      }

      const validatedRates = rates.map(rate => createChannelRateSchema.parse(rate));
      const channelRates = await channelManagerService.updateChannelRates(channelRoomId, validatedRates);
      
      responseHandler(res, 200, 'Channel rates updated successfully', channelRates);
    } catch (error: any) {
      console.error('Error updating channel rates:', error);
      handleError(res, error);
    }
  }

  async getChannelRates(req: Request, res: Response) {
    try {
      const { channelRoomId } = req.params;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const channelRates = await channelManagerService.getChannelRates(channelRoomId, start, end);
      
      responseHandler(res, 200, 'Channel rates retrieved successfully', channelRates);
    } catch (error: any) {
      console.error('Error fetching channel rates:', error);
      handleError(res, error);
    }
  }

  // Availability Operations
  async createChannelAvailability(req: Request, res: Response) {
    try {
      const validatedData = createChannelAvailabilitySchema.parse(req.body);
      const channelAvailability = await channelManagerService.createChannelAvailability(validatedData);
      
      responseHandler(res, 201, 'Channel availability created successfully', channelAvailability);
    } catch (error: any) {
      console.error('Error creating channel availability:', error);
      handleError(res, error);
    }
  }

  async updateChannelAvailability(req: Request, res: Response) {
    try {
      const { channelRoomId } = req.params;
      const { availability } = req.body;
      
      if (!Array.isArray(availability)) {
        res.status(400);
        handleError(res, new Error('Availability must be an array'));
        return;
      }

      const validatedAvailability = availability.map(avail => createChannelAvailabilitySchema.parse(avail));
      const channelAvailability = await channelManagerService.updateChannelAvailability(channelRoomId, validatedAvailability);
      
      responseHandler(res, 200, 'Channel availability updated successfully', channelAvailability);
    } catch (error: any) {
      console.error('Error updating channel availability:', error);
      handleError(res, error);
    }
  }

  // Channel Booking Operations
  async createChannelBooking(req: Request, res: Response) {
    try {
      const validatedData = createChannelBookingSchema.parse(req.body);
      const channelBooking = await channelManagerService.createChannelBooking(validatedData);
      
      responseHandler(res, 201, 'Channel booking created successfully', channelBooking);
    } catch (error: any) {
      console.error('Error creating channel booking:', error);
      handleError(res, error);
    }
  }

  async getChannelBookings(req: Request, res: Response) {
    try {
      const { channelId, status } = req.query;
      const channelBookings = await channelManagerService.getChannelBookings(
        channelId as string,
        status as string
      );
      
      responseHandler(res, 200, 'Channel bookings retrieved successfully', channelBookings);
    } catch (error: any) {
      console.error('Error fetching channel bookings:', error);
      handleError(res, error);
    }
  }

  async getChannelBookingById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const channelBooking = await channelManagerService.getChannelBookingById(id);
      
      if (!channelBooking) {
        res.status(404);
        handleError(res, new Error('Channel booking not found'));
        return;
      }
      
      responseHandler(res, 200, 'Channel booking retrieved successfully', channelBooking);
    } catch (error: any) {
      console.error('Error fetching channel booking:', error);
      handleError(res, error);
    }
  }

  async updateChannelBookingStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        res.status(400);
        handleError(res, new Error('Status is required'));
        return;
      }

      const channelBooking = await channelManagerService.updateChannelBookingStatus(id, status);
      
      responseHandler(res, 200, 'Channel booking status updated successfully', channelBooking);
    } catch (error: any) {
      console.error('Error updating channel booking status:', error);
      handleError(res, error);
    }
  }

  // Sync Operations
  async triggerChannelSync(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const { syncType } = req.body;
      
      if (!['rates', 'availability', 'bookings'].includes(syncType)) {
        res.status(400);
        handleError(res, new Error('Invalid sync type. Must be rates, availability, or bookings'));
        return;
      }

      await channelManagerService.markChannelForSync(channelId, syncType);
      
      responseHandler(res, 200, `Channel sync triggered for ${syncType}`);
    } catch (error: any) {
      console.error('Error triggering channel sync:', error);
      handleError(res, error);
    }
  }

  // Dashboard Statistics
  async getChannelManagerStats(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      
      const stats = await prisma.$transaction(async (tx) => {
        const totalBookings = await tx.channelBooking.count({
          where: { channelId },
        });

        const confirmedBookings = await tx.channelBooking.count({
          where: { 
            channelId,
            status: 'CONFIRMED',
          },
        });

        const totalRevenue = await tx.channelBooking.aggregate({
          where: { 
            channelId,
            status: 'CONFIRMED',
          },
          _sum: {
            netAmount: true,
          },
        });

        const totalCommission = await tx.channelBooking.aggregate({
          where: { 
            channelId,
            status: 'CONFIRMED',
          },
          _sum: {
            channelCommission: true,
          },
        });

        const activeRooms = await tx.channelRoom.count({
          where: { 
            channelId,
            isActive: true,
          },
        });

        return {
          totalBookings,
          confirmedBookings,
          totalRevenue: totalRevenue._sum.netAmount || 0,
          totalCommission: totalCommission._sum.channelCommission || 0,
          activeRooms,
        };
      });
      
      responseHandler(res, 200, 'Channel manager statistics retrieved successfully', stats);
    } catch (error: any) {
      console.error('Error fetching channel manager stats:', error);
      handleError(res, error);
    }
  }
}

export default new ChannelManagerController(); 