import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
}

