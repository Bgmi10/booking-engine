import { any, boolean, z } from "zod";

export const createCheckoutSessionSchema = z.object({
  roomId: z.string(),
  guestName: z.string(),
  guestEmail: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guestPhone: z.string(),
  guestNationality: z.string(),
});

const RestrictionType = z.enum([
  "CLOSE_TO_STAY",
  "CLOSE_TO_ARRIVAL",
  "CLOSE_TO_DEPARTURE",
  "MIN_LENGTH",
  "MAX_LENGTH",
  "ADVANCE_BOOKING",
]);

const RateScope = z.enum(["ALL_RATES", "SPECIFIC_RATES", "BASE_RATE"]);
const RoomScope = z.enum(["ALL_ROOMS", "SPECIFIC_ROOMS"]);

const RestrictionExceptionSchema = z.object({
  id: z.string().optional(),
  bookingRestrictionId: z.string().optional(),

  minLengthOverride: z.number().int().positive().optional(),
  maxLengthOverride: z.number().int().positive().optional(),

  exceptionStartDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid exceptionStartDate" })
    .optional(),

  exceptionEndDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid exceptionEndDate" })
    .optional(),

  exceptionDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),

  rateScope: RateScope.optional().nullable(),
  ratePolicyIds: z.array(z.string()).optional(),

  roomScope: RoomScope.optional().nullable(),
  roomIds: z.array(z.string()).optional(),

  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
});


export const bookingRestrictionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: RestrictionType,
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid startDate" }),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid endDate" }),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  rateScope: RateScope.default("ALL_RATES").optional().nullable(),
  ratePolicyIds: z.array(z.string()).optional().nullable(),
  roomScope: RoomScope.default("ALL_ROOMS").optional().nullable(),
  roomIds: z.array(z.string()).optional().nullable(),
  minLength: z.number().int().positive().optional().nullable(),
  maxLength: z.number().int().positive().optional().nullable(),
  minAdvance: z.number().int().nonnegative().optional().nullable(),
  maxAdvance: z.number().int().nonnegative().optional().nullable(),
  sameDayCutoffTime: z
    .string()
    .optional().nullable(),
  priority: z.number().int().default(0).optional().nullable(),
  isActive: z.boolean().default(true),
  exceptions: z.array(RestrictionExceptionSchema).optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export const bookingRestrictionUpdateSchema = bookingRestrictionSchema.partial();
