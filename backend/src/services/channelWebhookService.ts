import prisma from '../prisma/index';
import { bookingComWebhookSchema, expediaWebhookSchema, airbnbWebhookSchema } from '../zod/channelWebhook.schema';

export class ChannelWebhookService {
  // Process webhook from Booking.com
  async processBookingComWebhook(channelId: string, payload: any): Promise<any> {
    const validatedData = bookingComWebhookSchema.parse(payload);
    
    // Find the channel manager
    const channel = await prisma.channelManager.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error('Channel manager not found');
    }

    // Find the channel room
    const channelRoom = await prisma.channelRoom.findFirst({
      where: {
        channelId,
        channelRoomId: validatedData.room_id,
      },
      include: { room: true },
    });

    if (!channelRoom) {
      throw new Error('Channel room not found');
    }

    // Calculate commission and net amount
    const commission = channel.commissionPercentage 
      ? validatedData.total_amount * channel.commissionPercentage 
      : 0;
    const netAmount = validatedData.total_amount - commission;

    // Create or find customer
    let customer = await prisma.customer.findUnique({
      where: { guestEmail: validatedData.guest_email || 'unknown@channel.com' },
    });

    if (!customer && validatedData.guest_email) {
      customer = await prisma.customer.create({
        data: {
          guestFirstName: validatedData.guest_name.split(' ')[0] || 'Unknown',
          guestLastName: validatedData.guest_name.split(' ').slice(1).join(' ') || 'Guest',
          guestEmail: validatedData.guest_email,
          guestPhone: validatedData.guest_phone || '',
        },
      });
    }

    // Create channel booking
    const channelBooking = await prisma.channelBooking.create({
      data: {
        channelId,
        channelBookingId: validatedData.reservation_id,
        channelReservationId: validatedData.reservation_id,
        guestFirstName: validatedData.guest_name.split(' ')[0] || 'Unknown',
        guestLastName: validatedData.guest_name.split(' ').slice(1).join(' ') || 'Guest',
        guestEmail: validatedData.guest_email,
        guestPhone: validatedData.guest_phone,
        checkIn: new Date(validatedData.check_in),
        checkOut: new Date(validatedData.check_out),
        totalGuests: 1, // Default, could be enhanced
        totalAmount: validatedData.total_amount,
        currency: validatedData.currency,
        channelCommission: commission,
        netAmount,
        paymentModel: channel.paymentModel,
        paymentStatus: this.mapPaymentStatus(validatedData.payment_status),
        status: this.mapBookingStatus(validatedData.booking_status),
        specialRequests: validatedData.special_requests,
        channelMetadata: validatedData.metadata,
        confirmedAt: validatedData.booking_status === 'confirmed' ? new Date() : null,
        localCustomerId: customer?.id,
      },
      include: {
        channel: true,
        channelBookingRooms: true,
      },
    });

    // Create channel booking room
    await prisma.channelBookingRoom.create({
      data: {
        channelBookingId: channelBooking.id,
        channelRoomId: validatedData.room_id,
        roomName: channelRoom.room.name,
        roomType: channelRoom.room.description,
        ratePerNight: validatedData.total_amount / this.calculateNights(validatedData.check_in, validatedData.check_out),
        totalRate: validatedData.total_amount,
        currency: validatedData.currency,
        guestCount: 1,
      },
    });

    return channelBooking;
  }

  // Process webhook from Expedia
  async processExpediaWebhook(channelId: string, payload: any): Promise<any> {
    const validatedData = expediaWebhookSchema.parse(payload);
    
    const channel = await prisma.channelManager.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error('Channel manager not found');
    }

    const channelRoom = await prisma.channelRoom.findFirst({
      where: {
        channelId,
        channelRoomId: validatedData.roomTypeId,
      },
      include: { room: true },
    });

    if (!channelRoom) {
      throw new Error('Channel room not found');
    }

    const commission = channel.commissionPercentage 
      ? validatedData.totalPrice * channel.commissionPercentage 
      : 0;
    const netAmount = validatedData.totalPrice - commission;

    let customer = await prisma.customer.findUnique({
      where: { guestEmail: validatedData.guestEmail || 'unknown@channel.com' },
    });

    if (!customer && validatedData.guestEmail) {
      customer = await prisma.customer.create({
        data: {
          guestFirstName: validatedData.guestFirstName,
          guestLastName: validatedData.guestLastName,
          guestEmail: validatedData.guestEmail,
          guestPhone: validatedData.guestPhone || '',
        },
      });
    }

    const channelBooking = await prisma.channelBooking.create({
      data: {
        channelId,
        channelBookingId: validatedData.reservationId,
        channelReservationId: validatedData.reservationId,
        guestFirstName: validatedData.guestFirstName,
        guestLastName: validatedData.guestLastName,
        guestEmail: validatedData.guestEmail,
        guestPhone: validatedData.guestPhone,
        checkIn: new Date(validatedData.arrivalDate),
        checkOut: new Date(validatedData.departureDate),
        totalGuests: 1,
        totalAmount: validatedData.totalPrice,
        currency: validatedData.currency,
        channelCommission: commission,
        netAmount,
        paymentModel: channel.paymentModel,
        paymentStatus: this.mapPaymentStatus(validatedData.paymentStatus),
        status: this.mapBookingStatus(validatedData.reservationStatus),
        specialRequests: validatedData.specialRequests,
        channelMetadata: validatedData.metadata,
        confirmedAt: validatedData.reservationStatus === 'CONFIRMED' ? new Date() : null,
        localCustomerId: customer?.id,
      },
      include: {
        channel: true,
        channelBookingRooms: true,
      },
    });

    await prisma.channelBookingRoom.create({
      data: {
        channelBookingId: channelBooking.id,
        channelRoomId: validatedData.roomTypeId,
        roomName: channelRoom.room.name,
        roomType: channelRoom.room.description,
        ratePerNight: validatedData.totalPrice / this.calculateNights(validatedData.arrivalDate, validatedData.departureDate),
        totalRate: validatedData.totalPrice,
        currency: validatedData.currency,
        guestCount: 1,
      },
    });

    return channelBooking;
  }

  // Process webhook from Airbnb
  async processAirbnbWebhook(channelId: string, payload: any): Promise<any> {
    const validatedData = airbnbWebhookSchema.parse(payload);
    
    const channel = await prisma.channelManager.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error('Channel manager not found');
    }

    const channelRoom = await prisma.channelRoom.findFirst({
      where: {
        channelId,
        channelRoomId: validatedData.room_id,
      },
      include: { room: true },
    });

    if (!channelRoom) {
      throw new Error('Channel room not found');
    }

    const commission = channel.commissionPercentage 
      ? validatedData.total_payout * channel.commissionPercentage 
      : 0;
    const netAmount = validatedData.total_payout - commission;

    let customer = await prisma.customer.findUnique({
      where: { guestEmail: validatedData.guest_email || 'unknown@channel.com' },
    });

    if (!customer && validatedData.guest_email) {
      customer = await prisma.customer.create({
        data: {
          guestFirstName: validatedData.guest_first_name,
          guestLastName: validatedData.guest_last_name,
          guestEmail: validatedData.guest_email,
          guestPhone: validatedData.guest_phone || '',
        },
      });
    }

    const channelBooking = await prisma.channelBooking.create({
      data: {
        channelId,
        channelBookingId: validatedData.reservation_id,
        channelReservationId: validatedData.reservation_id,
        guestFirstName: validatedData.guest_first_name,
        guestLastName: validatedData.guest_last_name,
        guestEmail: validatedData.guest_email,
        guestPhone: validatedData.guest_phone,
        checkIn: new Date(validatedData.checkin),
        checkOut: new Date(validatedData.checkout),
        totalGuests: 1,
        totalAmount: validatedData.total_payout,
        currency: validatedData.currency,
        channelCommission: commission,
        netAmount,
        paymentModel: channel.paymentModel,
        paymentStatus: this.mapPaymentStatus(validatedData.payout_status),
        status: this.mapBookingStatus(validatedData.reservation_status),
        specialRequests: validatedData.special_requests,
        channelMetadata: validatedData.metadata,
        confirmedAt: validatedData.reservation_status === 'accepted' ? new Date() : null,
        localCustomerId: customer?.id,
      },
      include: {
        channel: true,
        channelBookingRooms: true,
      },
    });

    await prisma.channelBookingRoom.create({
      data: {
        channelBookingId: channelBooking.id,
        channelRoomId: validatedData.room_id,
        roomName: channelRoom.room.name,
        roomType: channelRoom.room.description,
        ratePerNight: validatedData.total_payout / this.calculateNights(validatedData.checkin, validatedData.checkout),
        totalRate: validatedData.total_payout,
        currency: validatedData.currency,
        guestCount: 1,
      },
    });

    return channelBooking;
  }

  // Convert channel booking to local booking
  async convertToLocalBooking(channelBookingId: string): Promise<any> {
    const channelBooking = await prisma.channelBooking.findUnique({
      where: { id: channelBookingId },
      include: {
        channel: true,
        channelBookingRooms: true,
      },
    });

    if (!channelBooking) {
      throw new Error('Channel booking not found');
    }

    if (channelBooking.localBookingId) {
      throw new Error('Channel booking already converted to local booking');
    }

    // Find the local room
    const channelRoom = await prisma.channelRoom.findFirst({
      where: {
        channelId: channelBooking.channelId,
        channelRoomId: channelBooking.channelBookingRooms[0]?.channelRoomId,
      },
      include: { room: true },
    });

    if (!channelRoom) {
      throw new Error('Local room not found for channel booking');
    }

    // Create or find customer
    let customer = channelBooking.localCustomerId 
      ? await prisma.customer.findUnique({ where: { id: channelBooking.localCustomerId } })
      : null;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          guestFirstName: channelBooking.guestFirstName,
          guestLastName: channelBooking.guestLastName,
          guestEmail: channelBooking.guestEmail || `${channelBooking.guestFirstName.toLowerCase()}.${channelBooking.guestLastName.toLowerCase()}@channel.com`,
          guestPhone: channelBooking.guestPhone || '',
        },
      });
    }

    // Create local booking
    const localBooking = await prisma.booking.create({
      data: {
        totalGuests: channelBooking.totalGuests,
        checkIn: channelBooking.checkIn,
        checkOut: channelBooking.checkOut,
        status: 'CONFIRMED',
        roomId: channelRoom.roomId,
        customerId: customer.id,
        request: channelBooking.specialRequests,
        metadata: {
          channelBookingId: channelBooking.id,
          channelName: channelBooking.channel.name,
          channelBookingId: channelBooking.channelBookingId,
          paymentModel: channelBooking.paymentModel,
          netAmount: channelBooking.netAmount,
        },
      },
    });

    // Update channel booking with local booking reference
    await prisma.channelBooking.update({
      where: { id: channelBookingId },
      data: {
        localBookingId: localBooking.id,
        localCustomerId: customer.id,
        confirmationNumber: localBooking.id,
      },
    });

    return localBooking;
  }

  // Utility methods
  private mapPaymentStatus(channelStatus: string): string {
    const statusMap: Record<string, string> = {
      'paid': 'PAID',
      'PAID': 'PAID',
      'pending': 'PENDING',
      'PENDING': 'PENDING',
      'cancelled': 'CANCELLED',
      'CANCELLED': 'CANCELLED',
    };
    return statusMap[channelStatus] || 'PENDING';
  }

  private mapBookingStatus(channelStatus: string): string {
    const statusMap: Record<string, string> = {
      'confirmed': 'CONFIRMED',
      'CONFIRMED': 'CONFIRMED',
      'accepted': 'CONFIRMED',
      'pending': 'PENDING',
      'PENDING': 'PENDING',
      'cancelled': 'CANCELLED',
      'CANCELLED': 'CANCELLED',
    };
    return statusMap[channelStatus] || 'PENDING';
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export default new ChannelWebhookService(); 