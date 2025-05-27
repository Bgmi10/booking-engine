import express from "express";

export const handleError = (res: express.Response, error: Error) => {
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