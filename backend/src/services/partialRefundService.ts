import { stripe } from '../config/stripeConfig';
import prisma from '../prisma';

interface PartialRefundRequest {
  bookingId: string;
  reason?: string;
  adminUserId?: string;
}

export class PartialRefundService {
  /**
   * Process a partial refund for a specific booking
   */
  static async processPartialRefund({ bookingId, reason, adminUserId }: PartialRefundRequest) {
    try {
      // 1. Get the booking with payment intent and room details
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          room: true,
          paymentIntent: true,
          customer: true
        }
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      if (booking.status === 'REFUNDED') {
        throw new Error(`Booking ${bookingId} is already refunded`);
      }

      if (!booking.paymentIntent) {
        throw new Error(`No payment intent found for booking ${bookingId}`);
      }

      if (!booking.paymentIntent.stripePaymentIntentId) {
        throw new Error(`No Stripe payment intent ID found for booking ${bookingId}`);
      }

      if (!booking.totalAmount) {
        throw new Error(`No total amount found for booking ${bookingId}`);
      }

      // 2. Create partial refund in Stripe with booking metadata
      const refund = await stripe.refunds.create({
        payment_intent: booking.paymentIntent.stripePaymentIntentId,
        amount: Math.round(booking.totalAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          bookingId: booking.id,
          roomName: booking.room.name,
          refundReason: reason || 'Partial booking cancellation',
          adminUserId: adminUserId || 'system',
          refundType: 'partial_room_refund'
        }
      });

      console.log(`Partial refund initiated for booking ${bookingId}: €${booking.totalAmount}`);
      console.log(`Stripe refund ID: ${refund.id}`);

      // The webhook will handle updating our database when Stripe confirms the refund
      return {
        success: true,
        refundId: refund.id,
        bookingId: booking.id,
        refundAmount: booking.totalAmount,
        message: `Partial refund of €${booking.totalAmount} initiated for ${booking.room.name}`
      };

    } catch (error) {
      console.error('Error processing partial refund:', error);
      throw error;
    }
  }

  /**
   * Get refund information for a booking
   */
  static async getBookingRefundInfo(bookingId: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          room: true,
          paymentIntent: true
        }
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      return {
        bookingId: booking.id,
        roomName: booking.room.name,
        totalAmount: booking.totalAmount,
        refundAmount: booking.refundAmount,
        status: booking.status,
        canRefund: booking.status !== 'REFUNDED' && booking.totalAmount && booking.totalAmount > 0,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut
      };

    } catch (error) {
      console.error('Error getting booking refund info:', error);
      throw error;
    }
  }

  /**
   * Get all bookings for a payment intent (for multi-room bookings)
   */
  static async getPaymentIntentBookings(paymentIntentId: string) {
    try {
      const bookings = await prisma.booking.findMany({
        where: { paymentIntentId },
        include: {
          room: true,
          customer: true
        },
        orderBy: { createdAt: 'asc' }
      });

      return bookings.map(booking => ({
        customer: booking.customer,
        bookingId: booking.id,
        roomName: booking.room.name,
        totalAmount: booking.totalAmount,
        refundAmount: booking.refundAmount,
        status: booking.status,
        canRefund: booking.status !== 'REFUNDED' && booking.totalAmount && booking.totalAmount > 0,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut
      }));

    } catch (error) {
      console.error('Error getting payment intent bookings:', error);
      throw error;
    }
  }
}