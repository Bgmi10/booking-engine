import { z } from "zod";

export const cashSettingsSchema = z.object({
  calculationPeriodDays: z.number().min(1).max(30),
  resetTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) // HH:MM format
});

export const waiterCashSummarySchema = z.object({
  waiterId: z.string().uuid(),
  summaryDate: z.string().datetime(),
  totalCashOrders: z.number().min(0),
  outstandingBalance: z.number()
});

export const cashDepositSchema = z.object({
  cashSummaryId: z.string().uuid(),
  amount: z.number().min(0),
  notes: z.string().optional()
});

export const verifyDepositSchema = z.object({
  actualReceived: z.number().min(0),
  action: z.enum(["accept", "discrepancy", "accept_loss"]),
  notes: z.string().optional()
});

export const finalizeSummarySchema = z.object({
  notes: z.string().optional()
});

export const paymentHistoryQuerySchema = z.object({
  date: z.string().optional(),
  paymentType: z.enum(["all", "cash", "card", "bank"]).optional(),
  waiterId: z.string().uuid().optional()
});

export const revenueAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dateRange: z.enum(["today", "week", "month", "quarter", "custom"]).optional()
});