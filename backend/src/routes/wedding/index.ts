import express from "express";
import { weddingCustomerRouter } from "./customerRoute";

export const weddingMainRoute = express.Router();

// Mount sub-routes
weddingMainRoute.use("/customers", weddingCustomerRouter);


export default weddingMainRoute;