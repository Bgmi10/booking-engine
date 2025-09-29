import { z } from "zod";

// Event type enum matching Prisma schema
export const EventTypeEnum = z.enum([
  "ENHANCEMNET",
  "PIZZA_NIGHT",
  "SPECIAL_DINNER",
  "WINE_TASTING",
  "COOKING_CLASS",
  "OTHERS"
]);

// Event status enum matching Prisma schema
export const EventStatusEnum = z.enum([
  "COMPLETED",
  "IN_PROGRESS",
  "CANCELLED"
]);

export const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().nullable().optional(),
  eventDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }),
  eventType: EventTypeEnum,
  enhancements: z.array(z.object({
    enhancementId: z.string().optional().nullable(),
    maxQuantity: z.number().nullable().optional(),
    overridePrice: z.number().nullable().optional()
  })),
  notes: z.string().nullable().optional(),
  maxCapacity: z.number().int().min(0).nullable().optional(),
  // Rule creation fields for events
  createRule: z.boolean().optional(),
  ruleName: z.string().optional(),
  availabilityType: z.enum(['ALWAYS', 'WEEKLY', 'SPECIFIC_DATES', 'SEASONAL']).optional(),
  availableDays: z.array(z.string()).optional(),
  availableTimeStart: z.string().nullable().optional(),
  availableTimeEnd: z.string().nullable().optional(),
  specificDates: z.array(z.string()).optional(),
  roomScope: z.enum(['ALL_ROOMS', 'SPECIFIC_ROOMS']).optional(),
  roomIds: z.array(z.string()).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional()
});

// Update event schema - requires reason but other fields are partial
export const updateEventSchema = z.object({
  name: z.string().min(1, "Event name is required").optional(),
  description: z.string().nullable().optional(),
  eventDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }).optional(),
  eventType: EventTypeEnum.optional(),
  status: EventStatusEnum.optional(),
  enhancements: z.array(z.object({
    enhancementId: z.string(),
    maxQuantity: z.number().nullable().optional(),
    overridePrice: z.number().nullable().optional()
  })).optional(),
  reason: z.string().min(1, "Reason for update is required"),
  notes: z.string().nullable().optional(),
  // Rule creation fields for events
  createRule: z.boolean().optional(),
  ruleName: z.string().optional(),
  availabilityType: z.enum(['ALWAYS', 'WEEKLY', 'SPECIFIC_DATES', 'SEASONAL']).optional(),
  availableDays: z.array(z.string()).optional(),
  availableTimeStart: z.string().nullable().optional(),
  availableTimeEnd: z.string().nullable().optional(),
  specificDates: z.array(z.string()).optional(),
  roomScope: z.enum(['ALL_ROOMS', 'SPECIFIC_ROOMS']).optional(),
  roomIds: z.array(z.string()).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional()
})