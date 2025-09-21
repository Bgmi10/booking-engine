import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import adminRouter from "./routes/adminRoute";
import cookieParser from "cookie-parser";
import roomsRouter from "./routes/roomRoute";
import bookingRouter from "./routes/bookingRouter";
import stipeWebhookRouter from "./routes/stripeWebhook";
import { cleanExpiredTempHolds, makeExpiredSessionToInactive, triggerAutomatedTasks, schedulePaymentReminders, scheduleWeddingReminders, updateExpiredLicensePlates, scheduleLicensePlateExport, startChannelSync, scheduleCheckinReminder, schedulePolicePortalReporting } from "./cron/cron";
import enhancementRouter from "./routes/enhancementRouter";
import sessionRouter from "./routes/sessionRoute";
import paymentIntentRouter from "./routes/paymentIntentRoute";
import voucherRouter from "./routes/voucherRouter";
import chargeRouter from "./routes/chargeRoute";
import customerRouter from "./routes/customerRoute";
import WebSocketManager from "./websocket/websocketManager";
import OrderEventService from "./services/orderEventService";
import paymentPlanRouter from "./routes/paymentPlanRoute";
import beds24WebhookRouter from "./routes/beds24Webhook";
import {
  generalLimiter,
  adminLimiter,
  paymentLimiter,
  webhookLimiter,
  publicLimiter,
  authLimiter,
  speedLimiter,
  aggressiveSpeedLimiter
} from "./middlewares/rateLimiter";
import { weddingMainRoute } from "./routes/wedding";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const app = express();

app.set('trust proxy', 1);

app.use(cookieParser());
app.use(cors({
  origin: [process.env.FRONTEND_DEV_URL as string, process.env.FRONTEND_PROD_URL as string],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(generalLimiter);
app.use(speedLimiter);
app.use("/api/v1/stripe", webhookLimiter, stipeWebhookRouter);
app.use(express.json({ limit: '10mb' }));
app.use("/api/v1/admin", aggressiveSpeedLimiter, adminLimiter, adminRouter);
app.use("/api/v1/auth", authLimiter);
app.use("/api/v1/payment-intent", aggressiveSpeedLimiter, paymentLimiter, paymentIntentRouter);
app.use("/api/v1/charges", aggressiveSpeedLimiter, paymentLimiter, chargeRouter);
app.use("/api/v1/payment-plans", paymentLimiter, paymentPlanRouter);
app.use("/api/v1/rooms", publicLimiter, roomsRouter);
app.use("/api/v1/bookings", publicLimiter, bookingRouter);
app.use("/api/v1/enhancements", publicLimiter, enhancementRouter);
app.use("/api/v1/sessions", publicLimiter, sessionRouter);
app.use("/api/v1/vouchers", publicLimiter, voucherRouter);
app.use("/api/v1/customers", publicLimiter, customerRouter);
app.use("/api/v1/beds24/webhook", webhookLimiter, beds24WebhookRouter);
app.use('/api/v1/wedding-portal', weddingMainRoute);

// cleanExpiredTempHolds();
// makeExpiredSessionToInactive();
// triggerAutomatedTasks();
// schedulePaymentReminders();
// scheduleWeddingReminders();
// updateExpiredLicensePlates();
// scheduleLicensePlateExport(); // Dynamic cron for license plate export emails
// startChannelSync(); // Start channel manager sync cron job
// scheduleCheckinReminder();
// //schedulePolicePortalReporting(); // Daily police portal reporting

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Initialize WebSocket manager
const wsManager = new WebSocketManager(server);

// Initialize Order Event Service
const orderEventService = new OrderEventService(wsManager);

// Make orderEventService available globally for use in routes
(global as any).orderEventService = orderEventService;

console.log('WebSocket server initialized');


