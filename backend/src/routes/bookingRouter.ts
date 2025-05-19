import { Router } from "express";
import { createCheckoutSession } from "../controllers/bookingController";

const bookingRouter = Router();

bookingRouter.post("/create-checkout-session", createCheckoutSession);

export default bookingRouter;

