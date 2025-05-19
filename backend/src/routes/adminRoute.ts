import { Router } from "express";
import { login } from "../controllers/adminController";
import { loginSchema } from "../zod/admin.auth.schema";
import validateMiddleware from "../middlewares/validateMiddleware";

const adminRouter = Router();

adminRouter.post("/login", validateMiddleware(loginSchema), login)

export default adminRouter;