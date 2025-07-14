import { z } from 'zod';

export const bookingComWebhookSchema = z.object({
  reservation_id: z.string(),
  hotel_id: z.string(),
  room_id: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  guest_name: z.string(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  total_amount: z.number(),
  currency: z.string().default('eur'),
  payment_status: z.enum(['paid', 'pending', 'cancelled']),
  booking_status: z.enum(['confirmed', 'pending', 'cancelled']),
  special_requests: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const expediaWebhookSchema = z.object({
  reservationId: z.string(),
  propertyId: z.string(),
  roomTypeId: z.string(),
  arrivalDate: z.string(),
  departureDate: z.string(),
  guestFirstName: z.string(),
  guestLastName: z.string(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  totalPrice: z.number(),
  currency: z.string().default('eur'),
  paymentStatus: z.enum(['PAID', 'PENDING', 'CANCELLED']),
  reservationStatus: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED']),
  specialRequests: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const airbnbWebhookSchema = z.object({
  reservation_id: z.string(),
  listing_id: z.string(),
  room_id: z.string(),
  checkin: z.string(),
  checkout: z.string(),
  guest_first_name: z.string(),
  guest_last_name: z.string(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  total_payout: z.number(),
  currency: z.string().default('eur'),
  payout_status: z.enum(['paid', 'pending', 'cancelled']),
  reservation_status: z.enum(['accepted', 'pending', 'cancelled']),
  special_requests: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}); 