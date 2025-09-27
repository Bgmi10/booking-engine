import { z } from "zod";

const availabilityTypeEnum = z.enum(["ALWAYS", "WEEKLY", "SPECIFIC_DATES", "SEASONAL"]);
const pricingTypeEnum = z.enum(["PER_GUEST", "PER_BOOKING", "PER_DAY"]);
const roomScopeEnum = z.enum(["ALL_ROOMS", "SPECIFIC_ROOMS"]);

// Enhancement base schemas
export const createEnhancementSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  pricingType: pricingTypeEnum,
  image: z.string().nullable().optional(),
  tax: z.number(),
  isActive: z.boolean().optional().default(true),
  type: z.enum(["PRODUCT", "EVENT"])
});

export const updateEnhancementSchema = z.object({
  name: z.string().optional().nullable(),
  tax: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  pricingType: pricingTypeEnum.optional().nullable(),
  image: z.string().nullable().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  type: z.enum(["PRODUCT", "EVENT"]).nullable()
});

// Enhancement Rule schemas
export const createEnhancementRuleSchema = z.object({
  name: z.string(),
  enhancementId: z.string(),
  availabilityType: availabilityTypeEnum.optional().default("ALWAYS"),
  
  // For WEEKLY availability
  availableDays: z.array(z.string()).nullable().optional(),
  availableTimeStart: z.string().nullable().optional(),
  availableTimeEnd: z.string().nullable().optional(),
  
  // For SEASONAL availability
  seasonal: z.boolean().nullable().optional(),
  seasonStart: z.string().nullable().optional(),
  seasonEnd: z.string().nullable().optional(),
  
  // For SPECIFIC_DATES availability
  specificDates: z.array(z.string()).nullable().optional(),
  
  // Overall validity period
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  
  // Room scope
  roomScope: roomScopeEnum.optional().default("ALL_ROOMS"),
  roomIds: z.array(z.string()).nullable().optional(),
  
  isActive: z.boolean().optional().default(true),
});

export const updateEnhancementRuleSchema = z.object({
  name: z.string().optional(),
  enhancementId: z.string().optional(),
  availabilityType: availabilityTypeEnum.optional(),
  
  // For WEEKLY availability
  availableDays: z.array(z.string()).nullable().optional(),
  availableTimeStart: z.string().nullable().optional(),
  availableTimeEnd: z.string().nullable().optional(),
  
  // For SEASONAL availability
  seasonal: z.boolean().nullable().optional(),
  seasonStart: z.string().nullable().optional(),
  seasonEnd: z.string().nullable().optional(),
  
  // For SPECIFIC_DATES availability
  specificDates: z.array(z.string()).nullable().optional(),
  
  // Overall validity period
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  
  // Room scope
  roomScope: roomScopeEnum.optional(),
  roomIds: z.array(z.string()).nullable().optional(),
  
  isActive: z.boolean().optional(),
});

// Schema for creating enhancement with rules in one go (optional convenience method)
export const createEnhancementWithRulesSchema = z.object({
  enhancement: createEnhancementSchema,
  rules: z.array(createEnhancementRuleSchema.omit({ enhancementId: true })).optional(),
});