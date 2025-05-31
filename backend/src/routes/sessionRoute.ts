import express from "express";
import { sessionController } from "../controllers/sessionController";

const sessionRouter = express.Router();

sessionRouter.get("/:sessionId", sessionController);

export default sessionRouter;
