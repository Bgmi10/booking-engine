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
