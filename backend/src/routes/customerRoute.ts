import Router from "express";
import { 
    getOrderItemsByLocation, 
    loginCustomer, 
    getCustomerProfile, 
    customerLogout, 
    createOrder,
    getOccupiedRooms
} from "../controllers/customerController";
import customerAuthMiddleware from "../middlewares/customerAuthMiddleware";

const customerRouter = Router();

customerRouter.get('/order-items', getOrderItemsByLocation);
customerRouter.get('/occupied-rooms', getOccupiedRooms);
customerRouter.post('/login', loginCustomer);
customerRouter.get('/profile', customerAuthMiddleware, getCustomerProfile);
customerRouter.post('/logout', customerLogout);
customerRouter.post('/orders', customerAuthMiddleware, createOrder);

export default customerRouter;