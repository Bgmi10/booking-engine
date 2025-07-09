import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

const devUrl = "https://localhost:5173";
const prodUrl = process.env.FRONTEND_PROD_URL;

export const getBaseUrl = (): string  | undefined => {
  return process.env.NODE_ENV === "local" ? devUrl : prodUrl;
};

export const findOrCreatePrice = async (itemData: { 
  name?: string;
  description?: string;
  unitAmount: number;
  currency: string;
  images?: string[];
  dates?: {
      checkIn: string;
      checkOut: string;
  };
  rateOption?: {
      name: string;
      id: string;
  };
  bookingIndex?: number;
}) => {
  const { name, description, unitAmount, currency, images, dates, rateOption, bookingIndex } = itemData;
  
  // Always create a new product and price for room bookings
  if (dates) {
      // Make the product name unique by including the booking index
      const uniqueProductName = `${name} - Booking ${bookingIndex || Date.now()}`;
      
      const product = await stripe.products.create({
          name: uniqueProductName,
          description,
          images,
          metadata: {
              checkIn: dates.checkIn,
              checkOut: dates.checkOut,
              rateOptionId: rateOption?.id || '',
              rateOptionName: rateOption?.name || '',
              bookingIndex: bookingIndex?.toString() || Date.now().toString()
          }
      });

      const price = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency,
      });

      return price.id;
  }

  // For non-room items (like enhancements), create unique prices per booking
  const uniqueProductName = `${name} - Booking ${bookingIndex || Date.now()}`;
  
  const product = await stripe.products.create({
      name: uniqueProductName,
      description,
      images,
      metadata: {
          bookingIndex: bookingIndex?.toString() || Date.now().toString()
      }
  });
  const price = await stripe.prices.create({
      product: product.id,
      unit_amount: unitAmount,
      currency,
  });

  return price.id;
};

export const getCheckoutUrls = (sessionId?: string) => {
  const baseUrl = getBaseUrl();
  return {
    successUrl: `${baseUrl}/${"payment-confirmation" + sessionId ? `?session_id=${sessionId}` : '?session_id={CHECKOUT_SESSION_ID}'}`,
    cancelUrl: `${baseUrl}/payment-cancelled`
  };
};
