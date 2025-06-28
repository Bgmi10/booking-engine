import Router from "express";
import { getOrderItemsByLocation, requestVerification, verifyCustomer, getCustomerProfile, customerLogout, createOrder } from "../controllers/customerController";
import customerAuthMiddleware from "../middlewares/customerAuthMiddleware";

const customerRouter = Router();

customerRouter.get('/order-items', getOrderItemsByLocation);
customerRouter.post('/request-verification', requestVerification);
customerRouter.get('/verify', verifyCustomer);
customerRouter.get('/profile', customerAuthMiddleware, getCustomerProfile);
customerRouter.post('/logout', customerLogout);
customerRouter.post('/orders', customerAuthMiddleware, createOrder)
export default customerRouter;