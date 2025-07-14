import express from "express";
import { ZodError } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const handleError = (res: express.Response, error: Error) => {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }));
    
    return res.status(400).json({ 
      error: "Validation failed", 
      details: validationErrors 
    });
  }

  // For other errors, return 500 with the error message
  return res.status(500).json({ error: error.message });
}

export const responseHandler = (res: express.Response, statusCode: number, message: string, data?: any) => {
  return res.status(statusCode).json({ message, data });
}

export function mapStripeToStatus(stripeStatus: string): {
    paymentStatus: "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";
    bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED";
  } {
    switch (stripeStatus) {
      case "paid":
        return { paymentStatus: "COMPLETED", bookingStatus: "CONFIRMED" };
      case "unpaid":
        return { paymentStatus: "FAILED", bookingStatus: "PENDING" };
      case "no_payment_required":
        return { paymentStatus: "COMPLETED", bookingStatus: "CONFIRMED" };
      default:
        return { paymentStatus: "PENDING", bookingStatus: "PENDING" };
    }
}

export const calculateNights = (checkIn: string, checkOut: string): number => {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getAdminDashboardSectionUrl = (section: string) => {
  return `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/admin/dashboard?sidebar=${section}`;
}

export const getWeddingPortalSectionUrl = (section: string) => {
  return `${process.env.NODE_ENV === "local" ? process.env.FRONTEND_DEV_URL : process.env.FRONTEND_PROD_URL}/wedding-portal/dashboard?sidebar=${section}`;
}

export function generateMergedBookingId(
  bookingIds: string[],
  options?: { maxPerIdLength?: number }
): string {
  const MIN = 1;
  const MAX = 5;
  const MAX_ID_PART_LENGTH = options?.maxPerIdLength ?? 6;

  if (!Array.isArray(bookingIds)) {
    throw new Error("bookingIds must be an array");
  }

  if (bookingIds.length < MIN || bookingIds.length > MAX) {
    throw new Error(`bookingIds must have between ${MIN} and ${MAX} items`);
  }

  // Normalize each ID: strip non-alphanumerics, trim to fixed length
  const normalizedIds = bookingIds
    .map((id) => id.replace(/[^a-zA-Z0-9]/g, "").substring(0, MAX_ID_PART_LENGTH))
    .sort(); // ensures consistent ordering

  return `BK-${normalizedIds.join("")}`;
}