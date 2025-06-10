import express from "express";
import { sessionController, generateReceiptPDF } from "../controllers/sessionController";

const sessionRouter = express.Router();

sessionRouter.get("/:sessionId", sessionController);

sessionRouter.get("/:sessionId/receipt", generateReceiptPDF );

export default sessionRouter;
