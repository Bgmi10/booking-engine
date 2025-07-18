import { Router } from "express";
import { checkPaymentIntentStatus, createSecondPayment, sendPaymentReminder } from "../controllers/paymentIntentController";

const paymentIntentRouter = Router();

paymentIntentRouter.get('/:id/check-status', checkPaymentIntentStatus);
paymentIntentRouter.post('/:paymentIntentId/create-second-payment', createSecondPayment);
paymentIntentRouter.post('/:paymentIntentId/send-reminder', sendPaymentReminder);

export default paymentIntentRouter;