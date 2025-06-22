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

export interface PaymentIntentDetailsViewProps {
  paymentIntent: PaymentIntent
  paymentDetails: PaymentDetails | null
  loadingPayment: boolean
  onSendEmail: () => void
  onCancel: () => void
  onRefund: () => void
  onViewPayment: () => void
  onDelete: () => any
  loadingAction: boolean
  generateConfirmationNumber: (pi: PaymentIntent) => string
}

interface Image {
  url: string;
  id: string;
}
// Type definitions
export interface Room {
  id: string
  name: string
  price: number
  description: string
  capacity: number
  images: Image
  minimumStay: number;
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string 
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PAYMENT_LINK_SENT"
  createdAt: string
  updatedAt: string
  paidAt?: string
  expiresAt: string
  createdByAdmin: boolean
  adminNotes?: string
  stripePaymentIntentId?: string
  stripeSessionId?: string
  stripePaymentLinkId?: string
  taxAmount: number
  totalAmount: number
  customerData: CustomerData
  bookingData: BookingData[]
  bookings: Array<{
    id: string
  }>
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
  specialrequest?: string;

}

export interface PaymentIntentsListProps {
  paymentIntents: PaymentIntent[]
  loading: boolean
  onViewDetails: (pi: PaymentIntent) => void
  onSendEmail: (piId: string) => void
  onCancel: (pi: PaymentIntent) => void
  onRefund: (pi: PaymentIntent) => void
  onViewPayment: (paymentIntentId: string) => void
  onEdit: (pi: PaymentIntent) => void
  onDelete: (piId: string) => void
  loadingAction: boolean
  editingPaymentIntent: string | null
  editFormData: PaymentIntent | null
  onUpdateEditFormData: (field: string, value: any) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  generateConfirmationNumber: (pi: PaymentIntent) => string
}
  
export interface PaymentIntentCardProps {
  paymentIntent: PaymentIntent
  onViewDetails: () => void
  onSendEmail: () => void
  onCancel: () => void
  onRefund: () => void
  onViewPayment: () => void
  onEdit: () => void
  onDelete: () => void
  loadingAction: boolean
  isEditing: boolean
  editFormData: PaymentIntent | null
  onUpdateEditFormData: (field: string, value: any) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  generateConfirmationNumber: (pi: PaymentIntent) => string
  selectionMode?: boolean;
  selectedBookingIds?: string[];
  onBookingSelect?: (bookingId: string, checked: boolean) => void;
}


export interface CustomerData {
  email: string
  firstName: string
  lastName: string
  middleName?: string
  nationality?: string
  phone: string
  receiveMarketing: boolean
  specialRequests?: string
  dob: string,
  passportNumber: string,
  passportExpiry: string,
  anniversaryDate: string,
  vipStatus: boolean,
  totalNigthsStayed: number;
  totalMoneySpent: number
}

export interface BookingData {
  adults: number
  checkIn: string
  checkOut: string
  id: string
  promotionCode: string
  specialRequests?: string;
  roomDetails: {
    minimumStay: number;
    id: string
    name: string
    description: string
    amenities: string[]
    capacity: number
    price: number
    
    images: Array<{
      id: string
      url: string
      roomId: string
    }>
  }
  rooms: number
  selectedEnhancements: any[]
  selectedRateOption: {
    id: string
    name: string
    description: string
    price: number
    type: string
    discountPercentage: number
    refundable: boolean
    isActive: boolean
  }
  selectedRoom: string
  totalPrice: number
}



export interface PaymentDetails {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  payment_method?: {
    card?: {
      brand: string
      last4: string
      exp_month: number
      exp_year: number
    }
  }
  billing_details?: {
    name?: string
    email?: string
    address?: {
      city?: string
      country?: string
      postal_code?: string
    }
  }
}

// Types based on your Prisma schema
export type VoucherProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  value: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Voucher = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "DISCOUNT" | "FIXED" | "PRODUCT";
  discountPercent: number | null;
  fixedAmount: number | null;
  maxUsage: number | null;
  currentUsage: number;
  maxUsagePerUser: number | null;
  validFrom: string;
  validTill: string;
  roomScope: "ALL_ROOMS" | "SPECIFIC_ROOMS";
  roomIds: string[];
  rateScope: "ALL_RATES" | "SPECIFIC_RATES";
  ratePolicyIds: string[];
  isActive: boolean;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  products: VoucherProduct[];
};


export interface RestrictionException {
  id?: string;
  minLengthOverride?: number;
  maxLengthOverride?: number;
  exceptionStartDate?: string;
  exceptionEndDate?: string;
  exceptionDaysOfWeek: number[];
  rateScope?: 'ALL_RATES' | 'SPECIFIC_RATES' | 'BASE_RATE';
  ratePolicyIds: string[];
  roomScope?: 'ALL_ROOMS' | 'SPECIFIC_ROOMS';
  roomIds: string[];
  isActive: boolean;
}

export interface BookingRestriction {
id?: string;
name: string;
description?: string;
type: 'CLOSE_TO_STAY' | 'CLOSE_TO_ARRIVAL' | 'CLOSE_TO_DEPARTURE' | 'MIN_LENGTH' | 'MAX_LENGTH' | 'ADVANCE_BOOKING';
startDate: string;
endDate: string;
daysOfWeek: number[];
rateScope: 'ALL_RATES' | 'SPECIFIC_RATES' | 'BASE_RATE';
ratePolicyIds: string[];
roomScope: 'ALL_ROOMS' | 'SPECIFIC_ROOMS';
roomIds: string[];
minLength?: number;
maxLength?: number;
minAdvance?: number;
maxAdvance?: number;
sameDayCutoffTime?: string;
priority: number;
isActive: boolean;
exceptions: RestrictionException[]
}