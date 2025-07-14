import prisma from '../prisma/index';
import { z } from 'zod';
import { 
  createChannelManagerSchema,
  updateChannelManagerSchema,
  createChannelRoomSchema,
  updateChannelRoomSchema,
  createChannelRateSchema,
  createChannelAvailabilitySchema,
  createChannelBookingSchema
} from '../zod/channelManager.schema';

export class ChannelManagerService {
  // Create a new channel manager
  async createChannelManager(data: z.infer<typeof createChannelManagerSchema>) {
    return await prisma.channelManager.create({
      data: {
        ...data,
        commissionPercentage: data.commissionPercentage ? data.commissionPercentage / 100 : null, // Store as decimal
        markupPercentage: data.markupPercentage ? data.markupPercentage / 100 : null, // Store as decimal
      },
    });
  }

  // Get all channel managers
  async getAllChannelManagers() {
    return await prisma.channelManager.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Get active channel managers
  async getActiveChannelManagers() {
    return await prisma.channelManager.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // Get channel manager by ID
  async getChannelManagerById(id: string) {
    return await prisma.channelManager.findUnique({
      where: { id },
      include: {
        channelRooms: {
          include: {
            room: true,
          },
        },
        _count: {
          select: {
            channelBookings: true,
            channelRooms: true,
          },
        },
      },
    });
  }

  // Update channel manager
  async updateChannelManager(id: string, data: z.infer<typeof updateChannelManagerSchema>) {
    const updateData: any = { ...data };
    
    if (data.commissionPercentage !== undefined) {
      updateData.commissionPercentage = data.commissionPercentage / 100;
    }
    if (data.markupPercentage !== undefined) {
      updateData.markupPercentage = data.markupPercentage / 100;
    }

    return await prisma.channelManager.update({
      where: { id },
      data: updateData,
    });
  }

  // Delete channel manager
  async deleteChannelManager(id: string) {
    return await prisma.channelManager.delete({
      where: { id },
    });
  }

  // Channel Room Operations
  async createChannelRoom(data: z.infer<typeof createChannelRoomSchema>) {
    return await prisma.channelRoom.create({
      data,
      include: {
        room: true,
        channel: true,
      },
    });
  }

  async getChannelRooms(channelId?: string) {
    return await prisma.channelRoom.findMany({
      where: channelId ? { channelId } : undefined,
      include: {
        room: true,
        channel: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateChannelRoom(id: string, data: z.infer<typeof updateChannelRoomSchema>) {
    return await prisma.channelRoom.update({
      where: { id },
      data,
      include: {
        room: true,
        channel: true,
      },
    });
  }

  async deleteChannelRoom(id: string) {
    return await prisma.channelRoom.delete({
      where: { id },
    });
  }

  // Rate Distribution Operations
  async createChannelRate(data: z.infer<typeof createChannelRateSchema>) {
    const channelRoom = await prisma.channelRoom.findUnique({
      where: { id: data.channelRoomId },
      include: { channel: true },
    });

    if (!channelRoom) {
      throw new Error('Channel room not found');
    }

    return await prisma.channelRate.create({
      data: {
        ...data,
        channelId: channelRoom.channelId,
        date: new Date(data.date),
      },
      include: {
        channelRoom: {
          include: {
            room: true,
            channel: true,
          },
        },
      },
    });
  }

  async updateChannelRates(channelRoomId: string, rates: Array<z.infer<typeof createChannelRateSchema>>) {
    const channelRoom = await prisma.channelRoom.findUnique({
      where: { id: channelRoomId },
      include: { channel: true },
    });

    if (!channelRoom) {
      throw new Error('Channel room not found');
    }

    // Use transaction to ensure data consistency
    return await prisma.$transaction(async (tx) => {
      // Delete existing rates for this room
      await tx.channelRate.deleteMany({
        where: { channelRoomId },
      });

      // Create new rates
      const newRates = await Promise.all(
        rates.map(rate =>
          tx.channelRate.create({
            data: {
              ...rate,
              channelId: channelRoom.channelId,
              date: new Date(rate.date),
            },
          })
        )
      );

      return newRates;
    });
  }

  async getChannelRates(channelRoomId: string, startDate?: Date, endDate?: Date) {
    return await prisma.channelRate.findMany({
      where: {
        channelRoomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
      include: {
        channelRoom: {
          include: {
            room: true,
            channel: true,
          },
        },
      },
    });
  }

  // Availability Operations
  async createChannelAvailability(data: z.infer<typeof createChannelAvailabilitySchema>) {
    const channelRoom = await prisma.channelRoom.findUnique({
      where: { id: data.channelRoomId },
      include: { channel: true },
    });

    if (!channelRoom) {
      throw new Error('Channel room not found');
    }

    return await prisma.channelAvailability.create({
      data: {
        ...data,
        channelId: channelRoom.channelId,
        date: new Date(data.date),
      },
      include: {
        channelRoom: {
          include: {
            room: true,
            channel: true,
          },
        },
      },
    });
  }

  async updateChannelAvailability(channelRoomId: string, availability: Array<z.infer<typeof createChannelAvailabilitySchema>>) {
    const channelRoom = await prisma.channelRoom.findUnique({
      where: { id: channelRoomId },
      include: { channel: true },
    });

    if (!channelRoom) {
      throw new Error('Channel room not found');
    }

    return await prisma.$transaction(async (tx) => {
      // Delete existing availability for this room
      await tx.channelAvailability.deleteMany({
        where: { channelRoomId },
      });

      // Create new availability
      const newAvailability = await Promise.all(
        availability.map(avail =>
          tx.channelAvailability.create({
            data: {
              ...avail,
              channelId: channelRoom.channelId,
              date: new Date(avail.date),
            },
          })
        )
      );

      return newAvailability;
    });
  }

  // Channel Booking Operations
  async createChannelBooking(data: z.infer<typeof createChannelBookingSchema>) {
    return await prisma.$transaction(async (tx) => {
      // Create the main booking
      const booking = await tx.channelBooking.create({
        data: {
          channelId: data.channelId,
          channelBookingId: data.channelBookingId,
          channelReservationId: data.channelReservationId,
          channelGuestId: data.channelGuestId,
          guestFirstName: data.guestFirstName,
          guestLastName: data.guestLastName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          guestNationality: data.guestNationality,
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          totalGuests: data.totalGuests,
          totalAmount: data.totalAmount,
          currency: data.currency,
          channelCommission: data.channelCommission,
          netAmount: data.netAmount,
          paymentModel: data.paymentModel,
          specialRequests: data.specialRequests,
          channelMetadata: data.channelMetadata,
          confirmedAt: new Date(),
        },
        include: {
          channel: true,
          channelBookingRooms: true,
        },
      });

      // Create room bookings
      if (data.rooms && data.rooms.length > 0) {
        await Promise.all(
          data.rooms.map(room =>
            tx.channelBookingRoom.create({
              data: {
                channelBookingId: booking.id,
                channelRoomId: room.channelRoomId,
                roomName: room.roomName,
                roomType: room.roomType,
                ratePerNight: room.ratePerNight,
                totalRate: room.totalRate,
                currency: room.currency,
                guestCount: room.guestCount,
              },
            })
          )
        );
      }

      return booking;
    });
  }

  async getChannelBookings(channelId?: string, status?: string) {
    return await prisma.channelBooking.findMany({
      where: {
        channelId: channelId || undefined,
        status: status as any || undefined,
      },
      include: {
        channel: true,
        channelBookingRooms: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getChannelBookingById(id: string) {
    return await prisma.channelBooking.findUnique({
      where: { id },
      include: {
        channel: true,
        channelBookingRooms: true,
      },
    });
  }

  async updateChannelBookingStatus(id: string, status: string) {
    const updateData: any = { status: status as any };
    
    if (status === 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    } else if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }

    return await prisma.channelBooking.update({
      where: { id },
      data: updateData,
      include: {
        channel: true,
        channelBookingRooms: true,
      },
    });
  }

  // Sync Operations
  async markChannelForSync(channelId: string, syncType: 'rates' | 'availability' | 'bookings') {
    const updateData: any = {
      lastSyncAt: new Date(),
      syncStatus: 'PENDING' as any, // Assuming ChannelSyncStatus is not defined yet
    };

    if (syncType === 'rates') {
      await prisma.channelRate.updateMany({
        where: { channelId },
        data: updateData,
      });
    } else if (syncType === 'availability') {
      await prisma.channelAvailability.updateMany({
        where: { channelId },
        data: updateData,
      });
    }
  }

  // Utility Methods
  async calculateChannelRate(baseRate: number, channel: any) {
    let channelRate = baseRate;

    // Apply markup if configured
    if (channel.markupPercentage) {
      channelRate = baseRate * (1 + channel.markupPercentage);
    }

    // Apply commission if configured
    if (channel.commissionPercentage) {
      channelRate = channelRate / (1 - channel.commissionPercentage);
    }

    return Math.round(channelRate * 100) / 100; // Round to 2 decimal places
  }

  async getRoomsAvailableForChannel(channelId: string) {
    return await prisma.room.findMany({
      where: {
        channelRooms: {
          none: {
            channelId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        capacity: true,
      },
    });
  }
}

export default new ChannelManagerService(); 