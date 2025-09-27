import express from "express";
import { forgetPassword, login, profile, registerCustomer, updatePassword, updateProfile } from "../../controllers/wedding/customerController";
import validateMiddleware from "../../middlewares/validateMiddleware";
import { registerSchema } from "../../zod/wedding/customer.schema";
import authMiddleware from "../../middlewares/authMiddlware";
import { logout } from "../../controllers/adminController";

export const weddingCustomerRouter = express.Router();

weddingCustomerRouter.post('/register', validateMiddleware(registerSchema),  registerCustomer);

weddingCustomerRouter.get('/profile', authMiddleware, profile);

weddingCustomerRouter.put('/profile', authMiddleware, updateProfile);

weddingCustomerRouter.get('/logout', logout);

weddingCustomerRouter.post('/login', login);

weddingCustomerRouter.post('/forget-password', forgetPassword);

weddingCustomerRouter.post('/update-password', updatePassword);