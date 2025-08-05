import { z } from "zod";
import { LicensePlateType } from "@prisma/client";

// Base license plate validation schema
export const licensePlateBaseSchema = z.object({
  plateNo: z.string()
    .min(1, "License plate number is required")
    .max(20, "License plate number cannot exceed 20 characters")
    .regex(/^[A-Z0-9\s\-]+$/i, "License plate can only contain letters, numbers, spaces, and hyphens")
    .transform(val => val.toUpperCase().trim()),
  
  type: z.nativeEnum(LicensePlateType, {
    errorMap: () => ({ message: "Type must be either ALLOW_LIST or BLOCK_LIST" })
  }).default(LicensePlateType.ALLOW_LIST),
  
  ownerName: z.string()
    .min(1, "Owner name is required")
    .max(100, "Owner name cannot exceed 100 characters")
    .trim(),
  
  validStartTime: z.string()
    .datetime("Valid start time must be a valid ISO datetime")
    .or(z.date())
    .transform(val => new Date(val)),
  
  validEndTime: z.string()
    .datetime("Valid end time must be a valid ISO datetime")
    .or(z.date())
    .transform(val => new Date(val)),
  
  userId: z.string()
    .uuid("User ID must be a valid UUID")
    .optional()
    .nullable(),
  
  bookingId: z.string()
    .uuid("Booking ID must be a valid UUID")
    .optional()
    .nullable(),
  
  notes: z.string()
    .max(500, "Notes cannot exceed 500 characters")
    .trim()
    .optional()
    .nullable()
});

// Create license plate schema
export const createLicensePlateSchema = licensePlateBaseSchema
  .refine((data) => {
    return new Date(data.validStartTime) < new Date(data.validEndTime);
  }, {
    message: "Valid start time must be before valid end time",
    path: ["validEndTime"]
  })
  .refine((data) => {
    return new Date(data.validEndTime) > new Date();
  }, {
    message: "Valid end time must be in the future",
    path: ["validEndTime"]
  });

// Update license plate schema (all fields optional except dates validation)
export const updateLicensePlateSchema = z.object({
  plateNo: z.string()
    .min(1, "License plate number is required")
    .max(20, "License plate number cannot exceed 20 characters")
    .regex(/^[A-Z0-9\s\-]+$/i, "License plate can only contain letters, numbers, spaces, and hyphens")
    .transform(val => val.toUpperCase().trim())
    .optional(),
  
  type: z.nativeEnum(LicensePlateType, {
    errorMap: () => ({ message: "Type must be either ALLOW_LIST or BLOCK_LIST" })
  }).optional(),
  
  ownerName: z.string()
    .min(1, "Owner name is required")
    .max(100, "Owner name cannot exceed 100 characters")
    .trim()
    .optional(),
  
  validStartTime: z.string()
    .datetime("Valid start time must be a valid ISO datetime")
    .or(z.date())
    .transform(val => new Date(val))
    .optional(),
  
  validEndTime: z.string()
    .datetime("Valid end time must be a valid ISO datetime")
    .or(z.date())
    .transform(val => new Date(val))
    .optional(),
  
  userId: z.string()
    .uuid("User ID must be a valid UUID")
    .optional()
    .nullable(),
  
  notes: z.string()
    .max(500, "Notes cannot exceed 500 characters")
    .trim()
    .optional()
    .nullable(),
  
  isActive: z.boolean().optional()
})
.refine((data) => {
  // If both start and end times are provided, validate the relationship
  if (data.validStartTime && data.validEndTime) {
    return new Date(data.validStartTime) < new Date(data.validEndTime);
  }
  return true;
}, {
  message: "Valid start time must be before valid end time",
  path: ["validEndTime"]
});

// Query parameters schema for filtering
export const licensePlateQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, "Page must be a positive number")
    .transform(val => parseInt(val))
    .refine(val => val > 0, "Page must be greater than 0")
    .default("1"),
  
  limit: z.string()
    .regex(/^\d+$/, "Limit must be a positive number")
    .transform(val => parseInt(val))
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100")
    .default("50"),
  
  type: z.nativeEnum(LicensePlateType).optional(),
  
  isActive: z.string()
    .transform(val => val === "true")
    .optional(),
  
  search: z.string()
    .max(50, "Search term cannot exceed 50 characters")
    .optional(),
  
  sortBy: z.enum(["createdAt", "plateNo", "ownerName", "validStartTime", "validEndTime"])
    .default("createdAt"),
  
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

// Export query parameters schema
export const exportLicensePlateQuerySchema = z.object({
  type: z.nativeEnum(LicensePlateType).optional(),
  
  isActive: z.enum(["true", "false", "all"]).default("true"),
  
  includeExpired: z.enum(["true", "false"]).default("false")
});

// User numberPlate field schema for user updates
export const updateUserNumberPlateSchema = z.object({
  numberPlate: z.string()
    .max(20, "License plate number cannot exceed 20 characters")
    .regex(/^[A-Z0-9\s\-]*$/i, "License plate can only contain letters, numbers, spaces, and hyphens")
    .transform(val => val ? val.toUpperCase().trim() : null)
    .optional()
    .nullable()
});

// License plate statistics query schema
export const licensePlateStatsQuerySchema = z.object({
  dateFrom: z.string()
    .datetime("Date from must be a valid ISO datetime")
    .optional(),
  
  dateTo: z.string()
    .datetime("Date to must be a valid ISO datetime")
    .optional()
});

// Schema for webhook license plate creation from bookings
export const webhookLicensePlateSchema = z.object({
  plateNo: z.string()
    .min(1, "License plate number is required")
    .max(20, "License plate number cannot exceed 20 characters")
    .regex(/^[A-Z0-9\s\-]+$/i, "License plate can only contain letters, numbers, spaces, and hyphens")
    .transform(val => val.toUpperCase().trim()),
  
  ownerName: z.string()
    .min(1, "Owner name is required")
    .max(100, "Owner name cannot exceed 100 characters")
    .trim(),
  
  validStartTime: z.date(),
  validEndTime: z.date(),
  bookingId: z.string().uuid("Booking ID must be a valid UUID"),
  userId: z.string().uuid("User ID must be a valid UUID").optional().nullable()
})
.refine((data) => {
  return data.validStartTime < data.validEndTime;
}, {
  message: "Valid start time must be before valid end time",
  path: ["validEndTime"]
});

// Types
export type CreateLicensePlateInput = z.infer<typeof createLicensePlateSchema>;
export type UpdateLicensePlateInput = z.infer<typeof updateLicensePlateSchema>;
export type LicensePlateQueryParams = z.infer<typeof licensePlateQuerySchema>;
export type ExportLicensePlateQueryParams = z.infer<typeof exportLicensePlateQuerySchema>;
export type UpdateUserNumberPlateInput = z.infer<typeof updateUserNumberPlateSchema>;
export type LicensePlateStatsQueryParams = z.infer<typeof licensePlateStatsQuerySchema>;
export type WebhookLicensePlateInput = z.infer<typeof webhookLicensePlateSchema>;