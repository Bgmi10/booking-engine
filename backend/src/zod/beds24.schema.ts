import { z } from 'zod';

// Schema for Beds24 room mapping
export const createBeds24RoomMappingSchema = z.object({
  localRoomId: z.string().uuid(),
  beds24RoomId: z.string().min(1),
  beds24RoomName: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateBeds24RoomMappingSchema = createBeds24RoomMappingSchema.partial();

// Schema for rate and availability sync
export const syncRatesAvailabilitySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  roomIds: z.array(z.string().uuid()).optional(), // Specific rooms to sync, if not provided sync all
  applyToFutureDates: z.boolean().default(false), // Apply rates to future dates
  roomMappings: z.array(z.string()).optional(), // Specific room mappings to sync
  markupPercent: z.number().default(0), // Markup percentage
  minStay: z.number().int().min(1).default(1),
  maxStay: z.number().int().min(1).default(30),
});

// Schema for manual rate push
export const pushRateSchema = z.object({
  roomId: z.string().min(1), // Beds24 room ID
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  rate: z.number().positive(),
  minStay: z.number().int().min(1).optional(),
  maxStay: z.number().int().min(1).optional(),
  available: z.number().int().min(0).max(10),
});

export const pushRatesSchema = z.object({
  rates: z.array(pushRateSchema).min(1),
});

// Schema for Beds24 incoming webhook booking
export const beds24BookingWebhookSchema = z.object({
  bookId: z.string(),
  propId: z.string(),
  roomId: z.string(),
  arrival: z.string(), // Date string
  departure: z.string(), // Date string
  numAdult: z.number().int().min(1),
  numChild: z.number().int().min(0).default(0),
  guestFirstName: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  guestCountry: z.string().optional(),
  price: z.number().min(0),
  commission: z.number().min(0).default(0),
  apiReference: z.string().optional(),
  bookingTime: z.string(), // DateTime string
  status: z.string(), // '0' = pending, '1' = confirmed, '2' = cancelled
  payStatus: z.string().optional(), // Payment status
  guestComments: z.string().optional(),
});

// Schema for fetching bookings with date range
export const getBeds24BookingsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Schema for Beds24 configuration/settings
export const beds24ConfigSchema = z.object({
  apiKey: z.string().min(1),
  propertyId: z.string().min(1),
  isActive: z.boolean().default(true),
  autoSync: z.boolean().default(false),
  syncFrequency: z.number().int().min(300).max(86400).default(3600), // 5 minutes to 24 hours
  defaultMinStay: z.number().int().min(1).default(1),
  defaultMaxStay: z.number().int().min(1).default(30),
});

export const updateBeds24ConfigSchema = beds24ConfigSchema.partial();

// Schema for room availability check
export const checkRoomAvailabilitySchema = z.object({
  roomId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
});

// Schema for bulk operations
export const bulkSyncSchema = z.object({
  operation: z.enum(['rates', 'availability', 'both']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  roomIds: z.array(z.string().uuid()).optional(),
  dryRun: z.boolean().default(false), // For testing without actually pushing to Beds24
});

// Response schemas for API responses
export const beds24RoomSchema = z.object({
  roomId: z.string(),
  roomName: z.string(),
  roomDescription: z.string().optional(),
  maxOccupancy: z.number().int().min(1),
  roomQty: z.number().int().min(1),
  isActive: z.boolean(),
});

export const beds24PropertySchema = z.object({
  propId: z.string(),
  propName: z.string(),
  propDescription: z.string().optional(),
  currency: z.string().default('EUR'),
  timezone: z.string().optional(),
});

// Webhook verification schema
export const webhookVerificationSchema = z.object({
  signature: z.string().optional(),
  timestamp: z.string().optional(),
  payload: z.any(),
});

export type CreateBeds24RoomMapping = z.infer<typeof createBeds24RoomMappingSchema>;
export type UpdateBeds24RoomMapping = z.infer<typeof updateBeds24RoomMappingSchema>;
export type SyncRatesAvailability = z.infer<typeof syncRatesAvailabilitySchema>;
export type PushRate = z.infer<typeof pushRateSchema>;
export type PushRates = z.infer<typeof pushRatesSchema>;
export type Beds24BookingWebhook = z.infer<typeof beds24BookingWebhookSchema>;
export type GetBeds24Bookings = z.infer<typeof getBeds24BookingsSchema>;
export type Beds24Config = z.infer<typeof beds24ConfigSchema>;
export type UpdateBeds24Config = z.infer<typeof updateBeds24ConfigSchema>;
export type CheckRoomAvailability = z.infer<typeof checkRoomAvailabilitySchema>;
export type BulkSync = z.infer<typeof bulkSyncSchema>;
export type Beds24Room = z.infer<typeof beds24RoomSchema>;
export type Beds24Property = z.infer<typeof beds24PropertySchema>;