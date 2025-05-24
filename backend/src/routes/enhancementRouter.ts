import { Router } from "express";
import { getEnhancements } from "../controllers/enhancementsController";

const enhancementRouter = Router();

enhancementRouter.post("/", getEnhancements);

export default enhancementRouter;
