import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { responseHandler } from "../utils/helper";

const customerAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.customertoken;  
  if (!token) {
    responseHandler(res, 401, "Unauthorized");
    return;
  }
  const decoded = verifyToken(token);
  (req as any).user = decoded;
  
  if (!decoded) {
    responseHandler(res, 401, "Token is invalid");
    return;
  }

  next();
};

export default customerAuthMiddleware;
