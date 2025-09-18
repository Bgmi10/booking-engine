import { Router } from "express";
import { createCheckoutSession, createSecondPaymentSession } from "../controllers/bookingController";

const bookingRouter = Router();

bookingRouter.post("/create-checkout-session", createCheckoutSession);
bookingRouter.post("/create-second-payment", createSecondPaymentSession);

export default bookingRouter;

