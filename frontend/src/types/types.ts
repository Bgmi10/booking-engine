import type { JSX } from "react";
import type { Customer } from "../hooks/useCustomers";

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
  numberPlate: string;
}

export interface BulkOverrideLog {
  id: string;
  userId: string;
  ratePolicyId: string;
  actionType: 'BULK_OVERRIDE' | 'BULK_INCREASE' | 'BULK_DECREASE';
  dateRangeStart: string;
  dateRangeEnd: string;
  roomsAffected: string[];
  overRideDetails: any;
  totalRoomsAffected: number;
  totalDatesAffected: number;
  daysAffected?: number[]; // Array of day indices (0=Sunday, 6=Saturday)
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  ratePolicy: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface Enhancement {
  id: string
  name: string
  description: string
  price: number
  tax?: number
  image?: string
  pricingType: "PER_GUEST" | "PER_BOOKING" | "PER_DAY"
  isActive: boolean
  createdAt: string
  updatedAt: string
  enhancementRules?: EnhancementRule[]
  seasonal: boolean;
  seasonStart: string;
  seasonEnd: string;
}

export interface EnhancementRule {
  id: string
  name: string
  enhancementId: string
  enhancement?: Enhancement
  availabilityType: "ALWAYS" | "WEEKLY" | "SPECIFIC_DATES" | "SEASONAL"
  availableDays: string[]
  availableTimeStart?: string
  availableTimeEnd?: string
  seasonal: boolean
  seasonStart?: string
  seasonEnd?: string
  specificDates?: string[]
  validFrom?: string
  validUntil?: string
  roomScope: "ALL_ROOMS" | "SPECIFIC_ROOMS"
  roomIds: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  name: string
  description?: string
  eventDate: string
  eventType: 'ENHANCEMNET' | 'PIZZA_NIGHT' | 'SPECIAL_DINNER' | 'WINE_TASTING' | 'COOKING_CLASS' | 'OTHERS'
  status: 'COMPLETED' | 'IN_PROGRESS' | 'CANCELLED'
  totalRevenue: number
  totalGuests: number
  maxCapacity?: number
  createdAt: string
  updatedAt: string
  eventEnhancements?: EventEnhancement[]
  eventParticipants?: EventParticipant[]
  eventInvitations?: EventInvitation[]
  _count?: {
    eventParticipants: number
    eventInvitations: number
  }
  logs?: any[]
}

export interface EventEnhancement {
  id: string
  eventId: string
  enhancementId: string
  enhancement: Enhancement
  overridePrice?: number
  maxQuantity?: number
  isActive: boolean
  createdAt: string
}

export interface EventParticipant {
  id: string
  eventId: string
  bookingId: string
  paymentIntentId: string
  customerId: string
  enhancementId: string
  participantType: 'GUEST' | 'MAIN_GUEST'
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'DECLINED'
  addedBy: 'MAIN_GUEST' | 'GUEST' | 'ADMIN'
  notes?: string
  createdAt: string
  updatedAt: string
  booking?: any
  enhancement?: Enhancement
  customer?: Customer
}

export interface EventInvitation {
  id: string
  eventId: string
  bookingId: string
  customerId: string
  invitationToken?: string
  tokenExpiresAt: string
  isMainGuest: boolean
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'NOT_APPLICABLE'
  sentAt?: string
  acceptedAt?: string
  declinedAt?: string
  createdAt: string
  updatedAt: string
  booking?: any
  customer?: Customer
}

export interface Beds24Booking {
  bookId: string;
  propId: string;
  roomId: string;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild: number;
  guestFirstName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  price: number;
  commission: number;
  apiReference: string;
  bookingTime: string;
  status: string;
  payStatus: string;
  guestComments: string;
}

export interface SyncConfiguration {
  autoSync: boolean;
  syncFrequency: string;
  markupPercent: number;
  minStay: number;
  maxStay: number;
  syncStartDate: string | Date | any;
  syncEndDate: string | Date | any;
  applyToFutureDates: boolean;
} 

export interface RateDatePrice {
  id: string;
  roomId: string;
  date: string;
  price: number;
  priceType: 'BASE_OVERRIDE' | 'ROOM_INCREASE' | 'ROOM_OVERRIDE';
  room: Room;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface RatePolicy {
  id: string;
  basePrice: number;
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
  adjustmentPercentage?: number;
  paymentStructure?: 'FULL_PAYMENT' | 'SPLIT_PAYMENT';
  cancellationPolicy?: 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_REFUNDABLE';
  createdAt: string;
  updatedAt: string;
  rateDatePrices: RateDatePrice[]
}

export interface PaymentIntentDetailsViewProps {
  onSendInvoice: (id: string) => void;
  paymentIntent: PaymentIntent
  paymentDetails: PaymentDetails | null
  loadingPayment: boolean
  onSendEmail: () => void
  onCancel: () => void
  onRefund: () => void
  onViewPayment: () => void
  onDelete: () => any
  onRestore?: () => void
  onRefresh?: () => void
  loadingAction: boolean
  isDeletedTab?: boolean
  hideViewPayments?: boolean
  hideInvoiceButtons?: boolean
}

interface Image {
  slice(arg0: number, arg1: number): unknown;
  length: number;
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
  maxCapacityWithExtraBed?: number;
  extraBedPrice?: number;
  allowsExtraBed: boolean;
  amenities: string[];
  roomRates: RoomRate[];
}

export type RefundStatus = "NOT_REFUNDED" | "CANCELLED_NO_REFUND" | "REFUND_PENDING" | "PARTIALLY_REFUNDED" | "FULLY_REFUNDED" | "REFUND_DENIED";

export interface PaymentIntent {
  id: string
  amount: number
  currency: string 
  status: "CREATED" | "PAYMENT_LINK_SENT" | "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED"
  createdAt: string
  updatedAt: string
  paidAt?: string
  outstandingAmount: number;
  expiresAt: string
  createdByAdmin: boolean
  customer?: CustomerData;
  customerId?: string;
  adminNotes?: string
  refundStatus?: RefundStatus
  bookingGroupId?: string;
  stripePaymentIntentId?: string
  stripeSessionId?: string
  stripePaymentLinkId?: string
  taxAmount: number
  totalAmount: number
  customerData: CustomerData
  bookingData: BookingData[]
  bookings: Booking[] 
  paymentMethod?: PaymentMethod
  actualPaymentMethod?: PaymentMethod // STRIPE | BANK_TRANSFER | CASH
  paymentStructure?: 'FULL_PAYMENT' | 'SPLIT_PAYMENT'
  prepaidAmount?: number
  remainingAmount?: number
  remainingDueDate?: string
  // Second payment fields
  secondPaymentLinkId?: string
  secondPaymentExpiresAt?: string
  secondPaymentStatus?: "CREATED" | "PAYMENT_LINK_SENT" | "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED"
}

export interface Booking {
  id: string
  roomId: string
  checkIn: string
  checkOut: string
  guestEmail: string
  totalGuests: number;
  guestFirstName: string
  guestMiddleName?: string
  guestLastName: string
  guestNationality: string
  guestPhone: string
  status: "PENDING" | "CONFIRMED" | "REFUNDED" | "CANCELLED"
  createdAt: string
  updatedAt: string
  room: Room
  paymentIntent?: PaymentIntent
  specialrequest?: string;
  request?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  adminCheckInNotes?: string;
  adminCheckOutNotes?: string;

}

export interface PaymentIntentsListProps {
  paymentIntents: PaymentIntent[]
  loading: boolean
  onViewDetails: (pi: PaymentIntent) => void
  onSendEmail: (piId: string) => void
  onCancel: (pi: PaymentIntent) => void
  onRefund: (pi: PaymentIntent) => void
  onFutureRefund?: (pi: PaymentIntent) => void
  onViewPayment: (paymentIntentId: string) => void
  onEdit: (pi: PaymentIntent) => void
  onDelete: (piId: PaymentIntent) => void
  loadingAction: boolean
  onConfirmBooking?: (paymentIntentId: string) => void
}
  
export interface PaymentIntentCardProps {
  paymentIntent: PaymentIntent
  onViewDetails: () => void
  onSendEmail: () => void
  onCancel: () => void
  onRefund: () => void
  onFutureRefund?: () => void
  onViewPayment: () => void
  onEdit: () => void
  onDelete: () => void
  onRestore?: () => void
  loadingAction: boolean
  isEditing?: boolean
  editFormData?: PaymentIntent | null
  onUpdateEditFormData?: any
  onSaveEdit?: () => void
  onCancelEdit?: () => void
  selectionMode?: boolean;
  selectedBookingIds?: string[];
  onBookingSelect?: (bookingId: string, checked: boolean) => void;
  onConfirmBooking?: () => void;
  isDeletedTab?: boolean;
}

type GENDER = 'MALE' | 'FEMALE';

export interface CustomerData {
  id?: string;
  isMainGuest?: boolean;
  guestType?: string;
  surname?: string;
  email: string
  gender?: GENDER;
  placeOfBirth?: string;
  city?: string;
  passportIssuedCountry?: string;
  idCard?: string;
  guestPhone?: string;
  guestFirstName?: string;
  guestNationality?: string;
  tcAgreed?: boolean;
  guestMiddleName?: string;
  carNumberPlate?: string;
  guestLastName?: string;
  guestEmail?: string | undefined | any;
  receiveMarketing: boolean
  receiveMarketingEmail?: boolean
  specialRequests?: string
  dob: string,
  passportNumber: string,
  passportExpiry: string,
  anniversaryDate: string,
  vipStatus: boolean,
  totalNigthsStayed: number;
  paymentIntents?: PaymentIntentData[]
  totalMoneySpent: number
  orders: any
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
    paymentStructure?: 'FULL_PAYMENT' | 'SPLIT_PAYMENT'
    cancellationPolicy?: 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_REFUNDABLE'
    fullPaymentDays?: number
    changeAllowedDays?: number
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
  validFromTime?: string;
  validTillTime?: string;
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
  onlyForAdmin: boolean;
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
  tax: number;
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
  hasExtraBed?: boolean;
  extraBedCount?: number;
  extraBedPrice?: number;
  showRoomAlternatives?: boolean;
  alternativeRooms?: Room[];
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
  dailyBookingStartTime: string;
  autoGroupingRoomCount?: number;
  dahuaApiUrl?: string;
  dahuaUsername?: string;
  dahuaPassword?: string;
  dahuaIsEnabled?: boolean;
  dahuaGateId?: string;
  dahuaLicensePlateExpiryHours?: number;
  licensePlateExpiryDays?: number;
  licensePlateDailyTriggerTime?: string;
  enableTaxOptimizationFeature: boolean;
  checkinReminderDays: number;
  onlineCheckinHomeImageUrl?: string;
  // Add other settings properties here as they are defined in the backend model
}

// Represents the state of the form inputs, typically strings
export interface SettingsFormValues {
  minStayDays?: string;
  taxPercentage?: string;
  dailyBookingStartTime: string;
  autoGroupingRoomCount?: string;
  dahuaApiUrl?: string;
  dahuaUsername?: string;
  dahuaPassword?: string;
  dahuaIsEnabled?: boolean;
  dahuaGateId?: string;
  dahuaLicensePlateExpiryHours?: string;
  licensePlateExpiryDays?: string;
  licensePlateDailyTriggerTime?: string;
  checkinReminderDays: number;
  onlineCheckinHomeImageUrl?: string;
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

// Room-related interfaces for pricing management
export interface RoomImage {
  id: string;
  url: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomForPricing {
  id: string;
  name: string;
  price: number;
  description: string;
  capacity: number;
  amenities: string[];
  images: RoomImage[];
  createdAt: string;
  updatedAt: string;
  maxCapacityWithExtraBed?: number;
  extraBedPrice?: number;
  allowsExtraBed: boolean;
}


// Room with rate policies for main room management
export interface RoomRate {
  ratePolicy: RatePolicy;
  percentageAdjustment: number
}

export interface RoomWithRates extends RoomForPricing {
  RoomRate: RoomRate[];
}

// Enhanced Payment Intent Card interfaces
export interface PaymentIntentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  stripePaymentLinkId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  totalAmount: number;
  outstandingAmount: number;
  bookingData: any[];
  customerData: any;
  createdAt: string;
  expiresAt?: string;
  orders: OrderItem[]
  paidAt?: string;
  bookings?: any[]; // Individual booking records
  createdByAdmin?: boolean;
  adminNotes?: string;
  actualPaymentMethod?: PaymentMethod;
  refundStatus?: RefundStatus;
  customer?: Customer | CustomerData
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string | null;
  description: string | null;
  status: string;
  expiredAt: string | null;
  createdAt: string;
  paymentMethod: string | null;
  paymentUrl: string | null;
  createdBy: string;
  adminNotes?: string;
  orderId?: string;
  refundInitiatedBy?: string;
  refundReason?: string;
  refundedAt?: string;
}

export interface Charge {
  id: string;
  paidAt?: string;
  description: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "REFUNDED";  
  createdAt: string | Date;
  currency: string;
  amount: number;
  paymentMethod: string;
  orderId: string;
  createdBy: string | null;
  adminNotes?: string;
  refundInitiatedBy?: string | any;
  refundReason?: string;
  refundedAt?: string;
}


export interface BookingGroup {
  id: string;
  groupName?: string;
  isAutoGrouped: boolean;
  outstandingAmount?: number;
  createdAt: string;
  updatedAt: string;
  mainGuestId: string;
  mainGuest: Customer;
  paymentIntents:PaymentIntent[];
  _count: {
    paymentIntents: number;
    charges: number;
    orders: number;
  };
  charges: Array<{
    id: string;
    amount: number;
    status: string;
    description?: string;
  }>;
  orders: Array<{
    id: string;
    total: number;
    status: string;
    locationNames: string[];
  }>;
}

export interface BookingGroupAuditLog {
  id: string;
  entityType: string;
  actionType: string;
  reason?: string;
  notes?: string;
  previousValues?: any;
  newValues?: any;
  changedFields: string[];
  createdAt: string;
  userId: string;
}

export interface EnhancedPaymentIntentCardProps {
  paymentIntent: PaymentIntent;
  onViewDetails?: (paymentIntent: any) => void;
  onSendEmail?: (id: string) => void;
  onCancel?: (paymentIntent: any) => void;
  onRefund?: (paymentIntent: any) => void;
  onFutureRefund?: (paymentIntent: any) => void;
  onViewPayment?: (stripePaymentIntentId: string) => void;
  onEdit?: (paymentIntent: any) => void;
  onDelete?: (id: string) => void;
  onRestore?: () => void;
  loadingAction?: boolean;
  selectionMode?: boolean;
  selectedBookingIds?: string[];
  onBookingSelect?: (bookingId: string, checked: boolean) => void;
  onConfirmBooking?: () => void;
  onRefresh?: () => void;
  isDeletedTab?: boolean;
  isEditing?: boolean,
  editFormData?: any,
  onUpdateEditFormData?: any,
  onSaveEdit?: () => void,
  onCancelEdit?: () => void,
}

export interface PaymentMethodInfo {
  icon: JSX.Element;
  label: string;
  color: string;
  bgColor: string;
}

