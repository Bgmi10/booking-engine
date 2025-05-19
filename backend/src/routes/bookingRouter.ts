import { Router } from "express";
import { createCheckoutSession } from "../controllers/bookingController";
import validateMiddleware from "../middlewares/validateMiddleware";
import { createCheckoutSessionSchema } from "../zod/booking.schema";

const bookingRouter = Router();

bookingRouter.post("/create-checkout-session", validateMiddleware(createCheckoutSessionSchema), createCheckoutSession);

export default bookingRouter;

