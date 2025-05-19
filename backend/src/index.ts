import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import adminRouter from "./routes/adminRoute";
import cookieParser from "cookie-parser";
import roomsRouter from "./routes/roomRoute";
import bookingRouter from "./routes/bookingRouter";
import stipeWebhookRouter from "./routes/stripeWebhook";

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [process.env.FRONTEND_DEV_URL as string, process.env.FRONTEND_PROD_URL as string],
  credentials: true,
}));

app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/stripe", stipeWebhookRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
