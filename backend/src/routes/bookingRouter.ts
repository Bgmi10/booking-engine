import { Router } from "express";
import { createCheckoutSession, createSecondPaymentSession } from "../controllers/bookingController";
import validateMiddleware from "../middlewares/validateMiddleware";
import { createCheckoutSessionSchema } from "../zod/booking.schema";

const bookingRouter = Router();

bookingRouter.post("/create-checkout-session", createCheckoutSession);
bookingRouter.post("/create-second-payment", createSecondPaymentSession);

export default bookingRouter;

