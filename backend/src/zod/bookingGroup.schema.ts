import { z } from 'zod';

// Booking Type enum
const BookingTypeEnum = z.enum([
  'BOOKING_COM',
  'EXPEDIA', 
  'AIRBNB',
  'WEDDING',
  'PRIVATE_EVENT',
  'DIRECT',
  'CORPORATE',
  'OTHER'
]);

// Create Booking Group Schema
export const createBookingGroupSchema = z.object({
  groupName: z.string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters')
    .trim(),
  
  paymentIntentIds: z.array(z.string().uuid('Invalid payment intent ID'))
    .min(1, 'At least one payment intent is required')
    .max(50, 'Cannot add more than 50 payment intents to a group'),
  
  mainGuestId: z.string()
    .uuid('Invalid main guest ID')
    .min(1, 'Main guest ID is required'),
  
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .transform(val => val?.trim() || 'Manual group creation via admin interface'),
  
  bookingType: BookingTypeEnum
    .default('DIRECT'),
  
  emailToMainGuestOnly: z.boolean()
    .default(true)
});

// Update Booking Group Schema (partial with optional fields)
export const updateBookingGroupSchema = createBookingGroupSchema.partial().extend({
  // These fields can be updated
  groupName: z.string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters')
    .trim()
    .optional(),
  
  mainGuestId: z.string()
    .uuid('Invalid main guest ID')
    .optional(),
  
  bookingType: BookingTypeEnum.optional(),
  
  emailToMainGuestOnly: z.boolean().optional(),
  
  // Remove paymentIntentIds from update as they have separate endpoints
}).omit({ paymentIntentIds: true });

// Add Payment Intents to Group Schema
export const addPaymentIntentsSchema = z.object({
  paymentIntentIds: z.array(z.string().uuid('Invalid payment intent ID'))
    .min(1, 'At least one payment intent is required')
    .max(50, 'Cannot add more than 50 payment intents at once'),
  
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .transform(val => val?.trim() || 'Added payment intents via admin interface')
});

// Remove Payment Intents from Group Schema  
export const removePaymentIntentsSchema = z.object({
  paymentIntentIds: z.array(z.string().uuid('Invalid payment intent ID'))
    .min(1, 'At least one payment intent is required'),
  
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .transform(val => val?.trim() || 'Removed payment intents via admin interface'),
  
  keepCharges: z.boolean()
    .default(false)
    .describe('Whether to keep group charges when removing payment intents')
});

// Delete Booking Group Schema
export const deleteBookingGroupSchema = z.object({
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .transform(val => val?.trim() || 'Deleted booking group via admin interface')
});

// Export types for TypeScript usage
export type CreateBookingGroupRequest = z.infer<typeof createBookingGroupSchema>;
export type UpdateBookingGroupRequest = z.infer<typeof updateBookingGroupSchema>;
export type AddPaymentIntentsRequest = z.infer<typeof addPaymentIntentsSchema>;
export type RemovePaymentIntentsRequest = z.infer<typeof removePaymentIntentsSchema>;
export type DeleteBookingGroupRequest = z.infer<typeof deleteBookingGroupSchema>;