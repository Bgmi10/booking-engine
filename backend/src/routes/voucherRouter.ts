import { Router } from "express";
import { validateVoucher } from "../controllers/voucherController";

const voucherRouter = Router();

voucherRouter.get('/validate/:code', validateVoucher);

export default voucherRouter;