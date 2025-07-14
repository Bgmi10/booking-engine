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
    request?: string // Add request field for customer notes
  }>
  paymentMethod?: PaymentMethod
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
  onConfirmBooking?: (paymentIntentId: string) => void
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
  onConfirmBooking?: () => void;
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
  fixedAmount: number | null
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

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
  orderItems: OrderItem[];
  createdAt: string;
  availabilityRule: any | null;
  updatedAt: string;
}


export interface OrderItem {
  role: string;
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  createdAt: string
  updatedAt: string
  isAvailable: boolean
}

// Location type definition
export interface Location {
  id: string
  name: string
  orderCategories: Category[]
  createdAt: string
  updatedAt: string
}


export interface Notification {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  dueDate?: string;
  createdAt: string;
  attachments?: any[];
  createdByUserId: string;
}


export interface KitchenOrder {
  id: string;
  orderId: string;
  items: any[];
  locationName: string;
  status: string;
  createdAt: string;
  assignedToKitchen?: string;
  customerName?: string;
  total?: number;
  hasWaiterItems?: boolean;
  hasKitchenItems?: boolean;
  requiresKitchen?: boolean;
  paymentMethod?: 'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER';
}


export interface AutomatedTaskRule {
  id: string;
  name: string;
  description?: string;
  taskTitle: string;
  taskDescription?: string;
  triggerType: string;
  triggerDay?: number;
  triggerTime?: string;
  assignedRole: string;
  roomScope: string;
  roomIds: string[];
  priority: string;
  dueDateOffset?: number;
  isActive: boolean;
}

export interface BookingItem {
  checkIn: string;
  checkOut: string;
  selectedRoom: string;
  rooms: number;
  adults: number;
  selectedEnhancements: Enhancement[];
  roomDetails?: Room;
  error?: string;
  selectedRateOption?: any;
  totalPrice?: number;
}

export interface CustomerDetails {
  firstName: string
  middleName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  specialRequests: string
}



export interface GeneralSettings { // Represents the actual data structure from/to the backend
  id: string;
  minStayDays: number;
  taxPercentage: number;
  chargePaymentConfig?: string;
  // Dahua Camera Settings
  dahuaApiUrl?: string;
  dahuaUsername?: string;
  dahuaPassword?: string;
  dahuaIsEnabled?: boolean;
  dahuaGateId?: string;
  dahuaLicensePlateExpiryHours?: number;
  // Add other settings properties here as they are defined in the backend model
}

// Represents the state of the form inputs, typically strings
export interface SettingsFormValues {
  minStayDays?: string;
  taxPercentage?: string;
  // Dahua Camera Settings
  dahuaApiUrl?: string;
  dahuaUsername?: string;
  dahuaPassword?: string;
  dahuaIsEnabled?: boolean;
  dahuaGateId?: string;
  dahuaLicensePlateExpiryHours?: string;
}

export interface AvailabilityRule {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  daysOfWeek: number[]; // [0-6]
  isActive: boolean;
}

export interface OrderCategory {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  orderItems: OrderItem[];
  isAvailable: boolean | null;
  availabilityRule: AvailabilityRule | null;
}

export interface WaiterOrder {
  id: string;
  orderId: string;
  items: any[];
  locationName: string;
  status: string;
  createdAt: string;
  waiterAssignedAt?: string;
  assignedToWaiter?: string;
  assignedToWaiterName?: string;
  customerName: string;
  total: number;
  hasKitchenItems: boolean;
  hasWaiterItems: boolean;
  paymentMethod: 'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER';
  customerId?: string;
  temporaryCustomerId?: string;
}

// Updated Product type that combines both definitions
export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  pricingModel: 'FIXED' | 'PER_PERSON';
  type: 'REGULAR' | 'WEDDING' | 'RESTAURANT';
  category: string;
  sampleMenu?: any;
  image?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// Wedding Proposal Types
export type ItineraryItemStatus = 'CONFIRMED' | 'OPTIONAL';

export type ItineraryItem = {
  id: string;
  dayId: string;
  productId: string;
  product: Product;
  guestCount: number;
  status: ItineraryItemStatus;
  price: number;
  notes?: string;
  customMenu?: any;
  createdAt: string;
  updatedAt: string;
};

export type ItineraryDay = {
  id: string;
  dayNumber: number;
  date: string;
  proposalId: string;
  items: ItineraryItem[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentStageStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentPlanStage = {
  id?: string;
  description: string;
  amount: number;
  dueDate: string;
  status?: PaymentStageStatus;
  stripePaymentIntentId?: string;
  stripePaymentUrl?: string;
  reminderSent?: boolean;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
  paymentPlan?: PaymentPlan;
};

export type PaymentPlan = {
  id: string;
  proposalId: string;
  totalAmount: number;
  currency: string;
  stages: PaymentPlanStage[];
  createdAt: string;
  updatedAt: string;
  proposal?: WeddingProposal;
};

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type ServiceRequestStatus = 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export type MessageSender = 'GUEST' | 'ADMIN';

export interface WeddingServiceAttachment {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  messageId: string;
  createdAt: string;
}

export interface WeddingServiceMessage {
  id: string;
  text: string | null;
  sender: MessageSender;
  requestId: string;
  createdAt: string;
  attachments: WeddingServiceAttachment[];
}

export interface WeddingServiceRequest {
  id: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  price?: number;
  guestCount?: number;
  proposalId: string;
  itineraryDayId?: string;
  messages: WeddingServiceMessage[];
  createdAt: string;
  updatedAt: string;
}

export type WeddingProposal = {
  id: string;
  name: string;
  status: ProposalStatus;
  weddingDate: string;
  mainGuestCount: number;
  termsAndConditions?: string;
  customerId: string;
  customer: {
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
  };
  itineraryDays: ItineraryDay[];
  paymentPlan?: PaymentPlan;
  holdExpiresAt?: string;
  sentEmailCount?: number;
  lastEmailSentAt?: string;
  serviceRequests?: WeddingServiceRequest[];
  createdAt: string;
  updatedAt: string;
};

// Bank Details interface
export interface BankDetails {
  id: string;
  name: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Payment Method type

export type PaymentMethod = 'STRIPE' | 'CASH' | 'BANK_TRANSFER';