import express from "express";
import { responseHandler } from "../utils/helper";
import { verifyToken } from "../utils/jwt";

export const onlineCheckInMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { onlineCheckInToken } = req.cookies;

    if (!onlineCheckInToken) {
        responseHandler(res, 400, "Unauthorized");
        return;
    }

    const isvalidToken = verifyToken(onlineCheckInToken);

    if (!isvalidToken) {
        responseHandler(res, 400, "Unauthorized");
        return;
    }
    
//@ts-ignore
    req.user = isvalidToken;

    next();
}