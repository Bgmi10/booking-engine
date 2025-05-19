import { z } from "zod";
import express from "express";
import { responseHandler } from "../utils/helper";

const validateMiddleware = (schema: z.ZodSchema) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { error } = schema.safeParse(req.body);
    if (error) {
      responseHandler(res, 400, "Invalid request", { error: error.message });
      return;
    }
    next();
  }
}

export default validateMiddleware;
