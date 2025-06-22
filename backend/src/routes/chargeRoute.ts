import { Router } from "express";
import { checkChargeStatus } from "../controllers/chargeController";

const chargeRouter = Router();

chargeRouter.get('/:id/check-status', checkChargeStatus)

export default chargeRouter