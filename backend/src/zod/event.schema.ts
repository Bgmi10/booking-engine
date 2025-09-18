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
  maxCapacity: z.number().int().min(0).nullable().optional()
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
  notes: z.string().nullable().optional()
})