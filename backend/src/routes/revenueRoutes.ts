import { Router } from "express";
import {
  getCashSettings,
  updateCashSettings,
  getWaiterCashSummary,
  createWaiterCashSummary,
  submitCashDeposit,
  getPendingDeposits,
  verifyDeposit,
  getDailySummary,
  finalizeDailySummary,
  getPaymentHistory,
  getRevenueAnalytics,
  getRevenueSettings,
  updateRevenueSettings
} from "../controllers/revenueController";
import authMiddleware from "../middlewares/authMiddlware";
import validateMiddleware from "../middlewares/validateMiddleware";
import {
  cashSettingsSchema,
  waiterCashSummarySchema,
  cashDepositSchema,
  verifyDepositSchema,
  finalizeSummarySchema
} from "../zod/revenue.schema";

const revenueRouter = Router();

// Cash Management Routes
revenueRouter.get("/cash/settings", authMiddleware, getCashSettings);
revenueRouter.put("/cash/settings", authMiddleware, validateMiddleware(cashSettingsSchema), updateCashSettings);

// Waiter Cash Summary Routes
revenueRouter.get("/cash/waiter/:waiterId/summary", authMiddleware, getWaiterCashSummary);
revenueRouter.post("/cash/waiter/summary", authMiddleware, validateMiddleware(waiterCashSummarySchema), createWaiterCashSummary);

// Cash Deposit Routes
revenueRouter.post("/cash/deposit", authMiddleware, validateMiddleware(cashDepositSchema), submitCashDeposit);
revenueRouter.get("/cash/deposits/pending", authMiddleware, getPendingDeposits);
revenueRouter.put("/cash/deposit/:depositId/verify", authMiddleware, validateMiddleware(verifyDepositSchema), verifyDeposit);

// Manager Daily Summary Routes
revenueRouter.get("/cash/daily-summary", authMiddleware, getDailySummary);
revenueRouter.put("/cash/daily-summary/:summaryId/finalize", authMiddleware, validateMiddleware(finalizeSummarySchema), finalizeDailySummary);

// Payment History Routes
revenueRouter.get("/payments/history", authMiddleware, getPaymentHistory);

// Revenue Analytics Routes
revenueRouter.get("/analytics", authMiddleware, getRevenueAnalytics);

// Revenue Settings Routes
revenueRouter.get("/settings", authMiddleware, getRevenueSettings);
revenueRouter.put("/settings", authMiddleware, updateRevenueSettings);

export default revenueRouter;