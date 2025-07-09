import express from 'express';
import { 
    createOrUpdatePaymentPlan,
    getPaymentPlan,
    createPaymentIntent,
    getPaymentStage,
    deletePaymentStage
} from '../controllers/paymentPlanController';
import authMiddleware from "../middlewares/authMiddlware";

const paymentPlanRouter = express.Router();

paymentPlanRouter.post('/proposals/:proposalId/payment-plan', authMiddleware, createOrUpdatePaymentPlan);
paymentPlanRouter.get('/proposals/:proposalId/payment-plan', authMiddleware, getPaymentPlan);
paymentPlanRouter.post('/payment-stages/:stageId/pay', authMiddleware, createPaymentIntent);
paymentPlanRouter.delete('/payment-stages/:stageId', authMiddleware, deletePaymentStage);
paymentPlanRouter.get('/client/payment-stages/:stageId', getPaymentStage);

export default paymentPlanRouter; 