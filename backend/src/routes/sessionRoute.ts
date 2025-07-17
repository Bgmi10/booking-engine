import express from "express";
import { sessionController, generateReceiptPDF, generateCustomReceiptPDF } from "../controllers/sessionController";

const sessionRouter = express.Router();

sessionRouter.get("/:sessionId", sessionController);

sessionRouter.get("/:sessionId/receipt", generateReceiptPDF);

// Custom receipt route for cash and bank transfer payments
sessionRouter.get("/receipts/:paymentIntentId", generateCustomReceiptPDF);

export default sessionRouter;
