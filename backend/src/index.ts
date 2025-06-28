import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import adminRouter from "./routes/adminRoute";
import cookieParser from "cookie-parser";
import roomsRouter from "./routes/roomRoute";
import bookingRouter from "./routes/bookingRouter";
import stipeWebhookRouter from "./routes/stripeWebhook";
import { cleanExpiredTempHolds, makeExpiredSessionToInactive, cleanupExpiredLicensePlates, initializeDahuaService, triggerAutomatedTasks } from "./cron/cron";
import enhancementRouter from "./routes/enhancementRouter";
import sessionRouter from "./routes/sessionRoute";
import paymentIntentRouter from "./routes/paymentIntentRoute";
import voucherRouter from "./routes/voucherRouter";
import chargeRouter from "./routes/chargeRoute";
import customerRouter from "./routes/customerRoute";
import WebSocketManager from "./websocket/websocketManager";
import OrderEventService from "./services/orderEventService";

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const app = express();

app.use(cookieParser());
app.use(cors({
  origin: [process.env.FRONTEND_DEV_URL as string, process.env.FRONTEND_PROD_URL as string],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api/v1/stripe", stipeWebhookRouter);
app.use(express.json());
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/enhancements", enhancementRouter);
app.use("/api/v1/sessions", sessionRouter);
app.use("/api/v1/payment-intent", paymentIntentRouter);
app.use("/api/v1/vouchers", voucherRouter);
app.use("/api/v1/charges", chargeRouter);
app.use("/api/v1/customers", customerRouter);

cleanExpiredTempHolds();
makeExpiredSessionToInactive();
cleanupExpiredLicensePlates();
initializeDahuaService();
triggerAutomatedTasks();

// Create HTTP server
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


