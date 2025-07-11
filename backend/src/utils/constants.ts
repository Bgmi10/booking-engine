import dotenv from "dotenv";

dotenv.config();

export const TEMP_HOLD_DURATION_MINUTES = 30;
export const baseUrl = process.env.NODE_ENV === "local" ? process.env.BASE_URL_DEV : process.env.BASE_URL_PROD;
export const now = new Date();
export const adminEmails = ["scottpauladams@gmail.com", "subashchandraboseravi45@gmail.com"];
