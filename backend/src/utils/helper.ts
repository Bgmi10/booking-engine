import express from "express";

export const handleError = (res: express.Response, error: Error) => {
  return res.status(500).json({ error: error.message });
}

export const responseHandler = (res: express.Response, statusCode: number, message: string, data?: any) => {
  return res.status(statusCode).json({ message, data });
}



