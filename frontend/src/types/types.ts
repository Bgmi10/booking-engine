export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    isActive: boolean;
    phone: string;
    updatedAt: string;
    profilePicture: string;
}

export interface Enhancement {
  id: string
  title: string
  description: string
  price: number
  image?: string
  pricingType: "PER_GUEST" | "PER_BOOKING" | "PER_DAY"
  availableDays: string[]
  seasonal: boolean
  seasonStart?: string
  seasonEnd?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RatePolicy {
  id: string;
  name: string;
  description: string;
  nightlyRate?: number;
  isActive: boolean;
  refundable?: boolean;
  prepayPercentage?: number;
  fullPaymentDays?: number;
  changeAllowedDays?: number;
  rebookValidityDays?: number;
  discountPercentage?: number;
  createdAt: string;
  updatedAt: string;
}


// Type definitions
export interface Room {
  id: string
  name: string
  price: number
  description: string
  capacity: number
}

export interface PaymentIntent {
  id: string
  amount: number
  status: "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELLED" | "EXPIRED" | "PAYMENT_LINK_SENT"
  paymentMethod: string
  createdAt: string
  expiresAt: string
  paidAt: string  
  bookingData: string
  customerData: string
  taxAmount: number
  totalAmount: number
  createdByAdmin: boolean
  adminUserId: string | null
  adminNotes: string | null
  stripePaymentIntentId: string | null
  stripeSessionId: string | null
}

export interface Booking {
  id: string
  roomId: string
  checkIn: string
  checkOut: string
  guestEmail: string
  guestFirstName: string
  guestMiddleName?: string
  guestLastName: string
  guestNationality: string
  guestPhone: string
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
  createdAt: string
  updatedAt: string
  room: Room
  paymentIntent?: PaymentIntent
}
