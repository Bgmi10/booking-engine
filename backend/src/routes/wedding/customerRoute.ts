import express from "express";
import { registerCustomer } from "../../controllers/wedding/customerController";
import validateMiddleware from "../../middlewares/validateMiddleware";
import { registerSchema } from "../../zod/wedding/customer.schema";

export const weddingCustomerRouter = express.Router();


weddingCustomerRouter.post('/register', validateMiddleware(registerSchema),  registerCustomer);