import { useState } from "react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import {
  Calendar,
  CreditCard,
  DollarSign, 
  Eye,
  Mail,
  Users,
  CheckCircle,
  Building2,
  Coins,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MapPin,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { getStatusColor } from "../../../utils/helper";
import IndividualBookingCard from "./IndividualBookingCard";
import { baseUrl } from "../../../utils/constants";
import toast from 'react-hot-toast';
import type { 
  EnhancedPaymentIntentCardProps, 
  PaymentMethodInfo,
  Booking, 
  BookingData
} from "../../../types/types";

export default function EnhancedPaymentIntentCard({
  paymentIntent,
  onViewDetails,
  onSendEmail,
  onRefund,
  onViewPayment,
  onDelete,
  onRestore,
  loadingAction,
  isEditing,
  editFormData,
  onUpdateEditFormData,
  onSaveEdit,
  onCancelEdit,
  generateConfirmationNumber,
  selectionMode = false,
  selectedBookingIds = [],
  onBookingSelect = () => {},
  onConfirmBooking,
  onRefresh,
  isDeletedTab = false
}: EnhancedPaymentIntentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [individualBookings, setIndividualBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showConfirmEmail, setShowConfirmEmail] = useState(false);
  const [showConfirmBooking, setShowConfirmBooking] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingConfirmBank, setLoadingConfirmBank] = useState(false);    
  const totalBookings = paymentIntent.bookingData?.length || 0;
  const totalNights = paymentIntent.bookingData?.reduce((sum, booking) => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    return sum + differenceInDays(checkOut, checkIn);
  }, 0) || 0;

  const displayData = isEditing && editFormData ? editFormData : paymentIntent;

  // Get payment method display info
  const getPaymentMethodInfo = (): PaymentMethodInfo => {
    if (paymentIntent.stripePaymentLinkId || paymentIntent.stripeSessionId) {
      return {
        icon: <CreditCard className="h-4 w-4" />,
        label: "STRIPE",
        color: "text-blue-600",
        bgColor: "bg-blue-100"
      };
    }
    
    switch (paymentIntent.paymentMethod) {
      case 'CASH':
        return {
          icon: <Coins className="h-4 w-4" />,
          label: "Cash",
          color: "text-green-600",
          bgColor: "bg-green-100"
        };
      case 'BANK_TRANSFER':
        return {
          icon: <Building2 className="h-4 w-4" />,
          label: "Bank Transfer",
          color: "text-purple-600",
          bgColor: "bg-purple-100"
        };
      default:
        return {
          icon: <CreditCard className="h-4 w-4" />,
          label: "Unknown",
          color: "text-gray-600",
          bgColor: "bg-gray-100"
        };
    }
  };

  // Fetch individual bookings when expanded
  const fetchIndividualBookings = async () => {
    if (individualBookings.length > 0) return; // Already loaded
    
    setLoadingBookings(true);
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intents/${paymentIntent.id}/bookings`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIndividualBookings(data.data || []);
      } else {
        toast.error('Failed to load individual bookings');
      }
    } catch (error) {
      console.error('Error fetching individual bookings:', error);
      toast.error('Failed to load individual bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleExpand = () => {
    if (!expanded) {
      fetchIndividualBookings();
    }
    setExpanded(!expanded);
  };

  const handleBookingRefund = () => {
    // Refresh the individual bookings to show updated status
    setIndividualBookings([]);
    fetchIndividualBookings();
    // Also trigger parent refresh if needed
    if (onRefresh) {
      onRefresh();
    }
  };

  // Handler for resending bank transfer instructions
  const handleResendBankTransfer = async () => {
    setLoadingResend(true);
    try {
      const res = await fetch(baseUrl + `/admin/bookings/${paymentIntent.id}/resend-bank-transfer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        toast.success('Bank transfer instructions resent successfully');
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to resend bank transfer instructions');
      }
    } catch (e) {
      toast.error('Failed to resend bank transfer instructions');
    } finally {
      setLoadingResend(false);
    }
  };

  // Handler for confirming as bank transfer
  const handleConfirmAsBankTransfer = async () => {
    setLoadingConfirmBank(true);
    try {
      const res = await fetch(`${baseUrl}/admin/bookings/${paymentIntent.id}/confirm-payment-method`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualPaymentMethod: 'BANK_TRANSFER' })
      });
      if (res.ok) {
        toast.success('Booking confirmed as paid by bank transfer.');
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to confirm as bank transfer.');
      }
    } catch (e) {
      toast.error('Failed to confirm as bank transfer.');
    } finally {
      setLoadingConfirmBank(false);
    }
  };

  const paymentMethodInfo = getPaymentMethodInfo();
  const statusColor = getStatusColor(displayData.status);

  const confirmedBookings = individualBookings.filter(b => b.status === 'CONFIRMED').length;
  const refundedBookings = individualBookings.filter(b => b.status === 'REFUNDED').length;

  // Check if booking can be confirmed (cash or bank transfer with PENDING status)
  const canConfirmBooking = (paymentIntent.paymentMethod === 'CASH' || paymentIntent.paymentMethod === 'BANK_TRANSFER') && paymentIntent.status === 'PENDING';

  // Add Spinner component like original
  const Spinner = () => (
    <svg className="animate-spin h-4 w-4 mr-1 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
  );

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayData.customerData.firstName}
                    onChange={(e) => onUpdateEditFormData?.("customerData.firstName", e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-lg font-semibold"
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    value={displayData.customerData.lastName}
                    onChange={(e) => onUpdateEditFormData?.("customerData.lastName", e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-lg font-semibold"
                    placeholder="Last Name"
                  />
                </div>
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">
                  {displayData.customerData.firstName} {displayData.customerData.lastName}
                </h3>
              )}
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  //@ts-ignore
                  statusColor.bg} ${statusColor.text}`}
              >
                {displayData.status}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentMethodInfo.bgColor} ${paymentMethodInfo.color}`}>
                {paymentMethodInfo.icon}
                {paymentMethodInfo.label}
              </span>
              {displayData.createdByAdmin && (
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  Admin Created
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Confirmation: {generateConfirmationNumber?.(displayData)}</p>
              {isEditing ? (
                <input
                  type="email"
                  value={displayData.customerData.email}
                  onChange={(e) => onUpdateEditFormData?.("customerData.email", e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                  placeholder="Email"
                />
              ) : (
                <p className="text-sm text-gray-600">{displayData.customerData.email}</p>
              )}
              {displayData.createdByAdmin && displayData.adminNotes && (
                <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  <strong>Admin Notes:</strong> {displayData.adminNotes}
                </p>
              )}
              {paymentIntent.bookings?.[0]?.request && (
                <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  <strong>Customer Request:</strong> {paymentIntent.bookings[0]?.request}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {totalBookings} booking{totalBookings !== 1 ? "s" : ""} • {totalNights} night
              {totalNights !== 1 ? "s" : ""}
            </div>
            {/* Outstanding Balance */}
            {(() => {
              const outstandingAmount = paymentIntent.outstandingAmount || 0;
              
              // Show outstanding balance if there's any unpaid amount
              if (outstandingAmount > 0) {
                return (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="text-xs text-amber-700 mb-1">Outstanding Amount:</div>
                    <div className="text-lg font-bold text-amber-900">
                      €{outstandingAmount.toFixed(2)}
                    </div>
                  </div>
                );
              }
              
              return null;
            })()}
          </div>
        </div>

        {/* Bookings Summary */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Bookings ({totalBookings})</h4>
          <div className="grid gap-2">
            {displayData.bookingData.map((booking: BookingData, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center">
                {selectionMode && (
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={selectedBookingIds.includes(booking.id)}
                    onChange={e => onBookingSelect(booking.id, e.target.checked)}
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{booking.roomDetails?.name || "Room"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {format(new Date(booking.checkIn), "MMM dd")} - {format(new Date(booking.checkOut), "MMM dd")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>
                      {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Summary for Multi-Room Bookings */}
        {expanded && individualBookings.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Individual Room Status:</span>
              <div className="flex space-x-4">
                {confirmedBookings > 0 && (
                  <span className="text-green-600 font-medium">
                    {confirmedBookings} Active
                  </span>
                )}
                {refundedBookings > 0 && (
                  <span className="text-red-600 font-medium">
                    {refundedBookings} Refunded
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button
                onClick={onSaveEdit}
                disabled={loadingAction}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loadingAction ? <Spinner /> : <Save className="h-4 w-4 mr-1" />}
                {loadingAction ? 'Processing...' : 'Save'}
              </button>
              <button
                onClick={onCancelEdit}
                disabled={loadingAction}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onViewDetails?.(paymentIntent)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </button>

              {/* Send Email with Confirmation */}
              {paymentIntent.status === "SUCCEEDED" && (
                <>
                  {showConfirmEmail ? (
                    <>
                      <button
                        onClick={() => onSendEmail?.(paymentIntent.id)}
                        disabled={loadingAction}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700"
                      >
                        {loadingAction ? <Spinner /> : <Mail className="h-4 w-4 mr-1" />}
                        {loadingAction ? 'Processing...' : 'Confirm Send Email'}
                      </button>
                      <button
                        onClick={() => setShowConfirmEmail(false)}
                        className="text-sm text-gray-600 underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowConfirmEmail(true)}
                      disabled={loadingAction}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Send Email
                    </button>
                  )}
                </>
              )}

              {/* View Payment */}
              {paymentIntent.stripePaymentIntentId && (
                <button
                //@ts-ignore
                  onClick={() => onViewPayment?.(paymentIntent.stripePaymentIntentId)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Payment Details
                </button>
              )}

              {/* Delete/Restore */}
              {isDeletedTab ? (
                <>
                  {onRestore && (
                    <button
                      onClick={onRestore}
                      disabled={loadingAction}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingAction ? <Spinner /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      {loadingAction ? 'Processing...' : 'Restore'}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete?.(paymentIntent.id)}
                    disabled={loadingAction}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingAction ? <Spinner /> : <Trash2 className="h-4 w-4 mr-1" />}
                    {loadingAction ? 'Processing...' : 'Hard Delete'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onDelete?.(paymentIntent.id)}
                  disabled={loadingAction}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loadingAction ? <Spinner /> : <Trash2 className="h-4 w-4 mr-1" />}
                  {loadingAction ? 'Processing...' : 'Delete'}
                </button>
              )}

              {/* Cancel & Refund with Confirmation */}
              {paymentIntent.status === "SUCCEEDED" && (
                    <>
                      <button
                        onClick={() => onRefund?.(paymentIntent)}
                        disabled={loadingAction}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700"
                      >
                        {loadingAction ? <Spinner /> : <DollarSign className="h-4 w-4 mr-1" />}
                        {loadingAction ? 'Processing...' : 'Refund'}
                      </button>
                </>
              )}

              {/* Confirm Booking (Cash/Bank Transfer) */}
              {canConfirmBooking && (
                <>
                  {showConfirmBooking ? (
                    <>
                      <button
                        onClick={onConfirmBooking}
                        disabled={loadingAction}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700"
                      >
                        {loadingAction ? <Spinner /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        {loadingAction ? 'Processing...' : 'Confirm Booking'}
                      </button>
                      <button
                        onClick={() => setShowConfirmBooking(false)}
                        className="text-sm text-gray-600 underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowConfirmBooking(true)}
                      disabled={loadingAction}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm Booking
                    </button>
                  )}
                </>
              )}

              {/* Cancel Booking (Pending/Link Sent) */}
              {(paymentIntent.status === "PAYMENT_LINK_SENT" || paymentIntent.status === "PENDING") && (
                <button
                  onClick={() => onRefund?.(paymentIntent)}
                  disabled={loadingAction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Cancel Booking
                </button>
              )}

              {/* Payment Link Expiry */}
              {paymentIntent.expiresAt && (
                <div className="flex items-center justify-end">
                  <span>
                    Payment link expires {formatDistanceToNow(new Date(paymentIntent.expiresAt), { addSuffix: true })}
                  </span>
                </div>
              )}

              {/* Resend Bank Transfer Instructions */}
              {paymentIntent.paymentMethod === 'BANK_TRANSFER' && 
               paymentIntent.status !== 'SUCCEEDED' && 
               paymentIntent.status !== 'REFUNDED' && 
               paymentIntent.status !== 'CANCELLED' && (
                <button
                  onClick={handleResendBankTransfer}
                  disabled={loadingResend || loadingAction}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {loadingResend ? <Spinner /> : <Mail className="h-4 w-4 mr-1" />}
                  {loadingResend ? 'Sending...' : 'Resend Payment Instructions'}
                </button>
              )}

              {/* Confirm as Bank Transfer */}
              {paymentIntent.paymentMethod === 'STRIPE' && 
               paymentIntent.status !== 'SUCCEEDED' && 
               paymentIntent.status !== 'REFUNDED' && 
               paymentIntent.status !== 'CANCELLED' && 
               !paymentIntent.actualPaymentMethod && (
                <button
                  onClick={handleConfirmAsBankTransfer}
                  disabled={loadingConfirmBank || loadingAction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors mt-2"
                >
                  {loadingConfirmBank ? 'Confirming...' : 'Confirm as Bank Transfer'}
                </button>
              )}

              {/* Show both intended and actual payment method if they differ */}
              {paymentIntent.actualPaymentMethod && paymentIntent.actualPaymentMethod !== paymentIntent.paymentMethod && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600 ml-2">
                  Paid by: {paymentIntent.actualPaymentMethod}
                </span>
              )}

              {/* Show Individual Rooms Button */}
              <button
                onClick={handleExpand}
                className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="mr-1">
                  {expanded ? 'Hide Individual Rooms' : 'Show Individual Rooms'}
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Individual Bookings */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Individual Room Bookings</h4>
            
            {loadingBookings ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-600">Loading room details...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {individualBookings.map((booking, index) => (
                  <IndividualBookingCard
                    key={index}
                    //@ts-ignore
                    booking={booking}
                    onRefund={handleBookingRefund}
                    onViewDetails={onViewDetails}
                    showRefundButton={paymentIntent.status === 'SUCCEEDED'}
                  />
                ))}
                
                {individualBookings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No individual booking records found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}