import { z } from "zod";

// Enums mapped from Prisma
export const VoucherTypeEnum = z.enum(["DISCOUNT", "FIXED", "PRODUCT"]);
export const VoucherRoomScopeEnum = z.enum(["ALL_ROOMS", "SPECIFIC_ROOMS"]);
export const VoucherRateScopeEnum = z.enum(["ALL_RATES", "SPECIFIC_RATES"]);
export const VoucherUsageStatusEnum = z.enum(["APPLIED", "REFUNDED", "CANCELLED"]);

// VoucherProduct Schema
export const voucherProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url(),
  value: z.number().nonnegative(),
  isActive: z.boolean(),
});

// Partial schema for update
export const updateVoucherProductSchema = voucherProductSchema.partial();

// Voucher Schema
export const voucherSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  code: z.string().min(1),
  type: VoucherTypeEnum,
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  fixedAmount: z.number().nonnegative().optional().nullable(),
  maxUsage: z.number().int().positive().optional().nullable(),
  maxUsagePerUser: z.number().int().positive().optional().nullable(),
  validFrom: z.coerce.date(),
  validTill: z.coerce.date(),
  roomIds: z.array(z.string()).optional().nullable(),
  roomScope: VoucherRoomScopeEnum.default("ALL_ROOMS"),
  rateScope: VoucherRateScopeEnum.default("ALL_RATES"),
  ratePolicyIds: z.array(z.string()).optional().nullable(),
  isActive: z.boolean(),
  productIds: z.array(z.string()).optional().nullable(),
});

// Partial schema for update
export const updateVoucherSchema = voucherSchema.partial();
