import { z } from 'zod';

export const createChannelManagerSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  apiEndpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  isActive: z.boolean().default(false),
  commissionPercentage: z.number().min(0).max(100).optional(),
  paymentModel: z.enum(['PAID_TO_CHANNEL', 'PAID_ON_SITE', 'MIXED']).default('PAID_TO_CHANNEL'),
  markupPercentage: z.number().min(0).optional(),
  currency: z.string().default('eur'),
  syncFrequency: z.number().min(300).default(3600), // minimum 5 minutes
  autoSync: z.boolean().default(false),
});

export const updateChannelManagerSchema = createChannelManagerSchema.partial();

export const createChannelRoomSchema = z.object({
  roomId: z.string().uuid(),
  channelId: z.string().uuid(),
  channelRoomId: z.string().min(1),
  channelRoomCode: z.string().optional(),
  isActive: z.boolean().default(true),
  channelPrice: z.number().positive().optional(),
  channelCurrency: z.string().default('eur'),
});

export const updateChannelRoomSchema = createChannelRoomSchema.partial();

export const createChannelRateSchema = z.object({
  channelRoomId: z.string().uuid(),
  date: z.string().datetime(),
  baseRate: z.number().positive(),
  channelRate: z.number().positive(),
  currency: z.string().default('eur'),
  isAvailable: z.boolean().default(true),
  availableRooms: z.number().int().min(0).default(1),
});

export const createChannelAvailabilitySchema = z.object({
  channelRoomId: z.string().uuid(),
  date: z.string().datetime(),
  availableRooms: z.number().int().min(0).default(1),
  totalRooms: z.number().int().min(1).default(1),
  isBlocked: z.boolean().default(false),
});

export const createChannelBookingSchema = z.object({
  channelId: z.string().uuid(),
  channelBookingId: z.string().min(1),
  channelReservationId: z.string().optional(),
  channelGuestId: z.string().optional(),
  guestFirstName: z.string().min(1),
  guestLastName: z.string().min(1),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  guestNationality: z.string().optional(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  totalGuests: z.number().int().min(1),
  totalAmount: z.number().positive(),
  currency: z.string().default('eur'),
  channelCommission: z.number().min(0).optional(),
  netAmount: z.number().positive(),
  paymentModel: z.enum(['PAID_TO_CHANNEL', 'PAID_ON_SITE', 'MIXED']).default('PAID_TO_CHANNEL'),
  specialRequests: z.string().optional(),
  channelMetadata: z.record(z.any()).optional(),
  rooms: z.array(z.object({
    channelRoomId: z.string(),
    roomName: z.string(),
    roomType: z.string().optional(),
    ratePerNight: z.number().positive(),
    totalRate: z.number().positive(),
    currency: z.string().default('eur'),
    guestCount: z.number().int().min(1).default(1),
  })),
}); 