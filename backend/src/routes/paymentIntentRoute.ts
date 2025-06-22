import { Router } from "express";
import { checkPaymentIntentStatus } from "../controllers/paymentIntentController";

const paymentIntentRouter = Router();

paymentIntentRouter.get('/:id/check-status', checkPaymentIntentStatus);

export default paymentIntentRouter;