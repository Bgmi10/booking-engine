import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  StickyNote
} from "lucide-react";
import toast from 'react-hot-toast';
import { baseUrl } from "../../../utils/constants";
import ManualCheckInButton, { useCheckInAvailability } from './ManualCheckInButton';
import CheckInCheckOutButtons from './CheckInCheckOutButtons';
import type { Customer } from "../../../hooks/useCustomers";

interface Booking {
  bookingId: any;
  id: string;
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  status: 'PENDING' | 'CONFIRMED' | 'REFUNDED' | 'CANCELLED';
  totalAmount?: number;
  refundAmount?: number;
  roomName: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  adminCheckInNotes?: string | null;
  adminCheckOutNotes?: string | null;
  room: {
    id: string;
    name: string;
    description: string;
  };
  customer: Customer;
  paymentIntentId: string;
  paymentIntent?: {
    outstandingAmount?: number;
    prepaidAmount?: number;
    remainingAmount?: number;
    totalAmount?: number;
    paymentStructure?: 'FULL_PAYMENT' | 'SPLIT_PAYMENT';
    status?: string;
  };
  guestCheckInAccess?: Array<{
    id: string;
    isMainGuest: boolean;
    customer: {
      id: string;
      guestFirstName: string;
      guestLastName: string;
      guestEmail: string;
      guestPhone?: string;
    };
  }>;
}

interface IndividualBookingCardProps {
  booking: Booking;
  onRefund?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
  onRefresh?: () => void;
  showRefundButton?: boolean;
}

export default function IndividualBookingCard({
  booking,
  onRefund,
  onViewDetails,
  onRefresh,
  showRefundButton = true
}: IndividualBookingCardProps) {
  const [showConfirmRefund, setShowConfirmRefund] = useState(false);
  const [loadingRefund, setLoadingRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [showGuestsModal, setShowGuestsModal] = useState(false);

  // Log booking data to understand structure
  console.log('Booking data:', booking);
  console.log('PaymentIntent:', booking.paymentIntent);

  const getStatusInfo = () => {
    switch (booking.status) {
      case 'CONFIRMED':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: "Confirmed",
          color: "text-green-600",
          bgColor: "bg-green-100"
        };
      case 'REFUNDED':
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: "Refunded",
          color: "text-red-600",
          bgColor: "bg-red-100"
        };
      case 'PENDING':
        return {
          icon: <RefreshCw className="h-4 w-4" />,
          label: "Pending",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100"
        };
      case 'CANCELLED':
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: "Cancelled",
          color: "text-gray-600",
          bgColor: "bg-gray-100"
        };
      default:
        return {
          icon: <RefreshCw className="h-4 w-4" />,
          label: "Unknown",
          color: "text-gray-600",
          bgColor: "bg-gray-100"
        };
    }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    setLoadingRefund(true);
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/partial-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: booking.bookingId,
          reason: refundReason
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Refund initiated successfully: €${data.data.refundAmount}`);
        setShowConfirmRefund(false);
        setRefundReason('');
        if (onRefund) {
          onRefund(booking.id);
        }
      } else {
        toast.error(data.message || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    } finally {
      setLoadingRefund(false);
    }
  };

  const statusInfo = getStatusInfo();
  const canRefund = booking.status === 'CONFIRMED' && booking.totalAmount && booking.totalAmount > 0;
  const isRefunded = booking.status === 'REFUNDED';

  // Check if manual check-in should be available
  const { isAvailable: isCheckInAvailable } = useCheckInAvailability(
    booking.status,
    booking.checkIn
  );


  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{booking.roomName}</h3>
          </div>
        </div>
        
        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.icon}
          <span className="ml-1">{statusInfo.label}</span>
        </div>
      </div>

      {/* Guest Info */}
      <div className="flex items-center space-x-2 mb-3">
        <Users className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-700">
          {booking.customer.guestFirstName} {booking.customer.guestLastName}
        </span>
        <span className="text-xs text-gray-500">• {booking.totalGuests} guests</span>
      </div>

      {/* Dates */}
      <div className="flex items-center space-x-2 mb-3">
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-700">
          {(() => {
            try {
              if (booking.checkIn && booking.checkOut) {
                const checkInDate = new Date(booking.checkIn);
                const checkOutDate = new Date(booking.checkOut);
                
                // Check if dates are valid
                if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
                  return (
                    <>
                      {format(checkInDate, 'MMM dd')} → {format(checkOutDate, 'MMM dd, yyyy')}
                    </>
                  );
                }
              }
              return <span className="text-gray-500 italic">Dates not available</span>;
            } catch (error) {
              return <span className="text-gray-500 italic">Dates not available</span>;
            }
          })()}
        </span>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-md font-medium text-green-700 ml-1">
            €{Number(booking.totalAmount || 0).toFixed(2)}
          </span>
        </div>
        
        {isRefunded && booking.refundAmount && (
          <div className="text-sm text-red-600">
            Refunded: €{Number(booking.refundAmount).toFixed(2)}
          </div>
        )}
      </div>
        

      {/* Admin Notes */}
      {(booking.adminCheckInNotes || booking.adminCheckOutNotes) && (
        <div className="mb-4 space-y-2">
          {booking.adminCheckInNotes && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <div className="flex items-start space-x-2">
                <StickyNote className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Check-in Notes:</p>
                  <p className="text-xs text-blue-600">{booking.adminCheckInNotes}</p>
                </div>
              </div>
            </div>
          )}
          {booking.adminCheckOutNotes && (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <div className="flex items-start space-x-2">
                <StickyNote className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Check-out Notes:</p>
                  <p className="text-xs text-gray-600">{booking.adminCheckOutNotes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onViewDetails?.(booking.id)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details
          </button>

          {/* View Guests Button */}
          <button
            onClick={() => setShowGuestsModal(true)}
            className="text-sm text-green-600 hover:text-green-800 font-medium"
          >
            View Guests ({booking.guestCheckInAccess?.length || 0})
          </button>

          {/* Manual Check-In Button */}
          {isCheckInAvailable && (
            <ManualCheckInButton
              type="booking"
              id={booking.bookingId}
              disabled={loadingRefund}
              variant="outline"
              size="sm"
              className="text-xs"
            />
          )}

          <CheckInCheckOutButtons
            type="booking"
            id={booking.bookingId || booking.id}
            customer={booking.customer}
            isCheckedIn={!!booking.checkedInAt}
            paymentIntentId={booking.paymentIntentId}
            isCheckedOut={!!booking.checkedOutAt}
            checkInDate={booking.checkIn}
            checkOutDate={booking.checkOut}
            outstandingAmount={booking.paymentIntent?.outstandingAmount || 0}
            paymentStructure={booking.paymentIntent?.paymentStructure}
            paymentDetails={booking.paymentIntent?.paymentStructure === 'SPLIT_PAYMENT' && booking.paymentIntent ? {
              totalAmount: booking.paymentIntent.totalAmount || booking.totalAmount || 0,
              prepaidAmount: booking.paymentIntent.prepaidAmount || 0,
              remainingAmount: booking.paymentIntent.remainingAmount || 0
            } : undefined}
            disabled={loadingRefund}
            variant="compact"
            onRefresh={onRefresh}
          />
        </div>

        {showRefundButton && canRefund && (
          <button
            onClick={() => setShowConfirmRefund(true)}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
          >
            Refund Room
          </button>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {showConfirmRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Refund</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to refund <strong>{booking.roomName}</strong> for{' '}
              <strong>€{Number(booking.totalAmount || 0).toFixed(2)}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for refund *
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please provide a reason for the refund..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmRefund(false);
                  setRefundReason('');
                }}
                disabled={loadingRefund}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={loadingRefund || !refundReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {loadingRefund && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Guests Modal */}
      {showGuestsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Guests in {booking.room.name}
                </h3>
              </div>
              <button
                onClick={() => setShowGuestsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-3">
                {(() => {
                  try {
                    if (booking.checkIn && booking.checkOut) {
                      const checkInDate = new Date(booking.checkIn);
                      const checkOutDate = new Date(booking.checkOut);
                      
                      // Check if dates are valid
                      if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
                        return (
                          <>
                            <strong>Check-in:</strong> {format(checkInDate, 'MMM dd, yyyy')} → {' '}
                            <strong>Check-out:</strong> {format(checkOutDate, 'MMM dd, yyyy')}
                          </>
                        );
                      }
                    }
                    return <span className="text-gray-500 italic">Dates not available</span>;
                  } catch (error) {
                    return <span className="text-gray-500 italic">Dates not available</span>;
                  }
                })()}
              </div>
            </div>

            {booking.guestCheckInAccess && booking.guestCheckInAccess.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Guests ({booking.guestCheckInAccess.length}):</h4>
                <div className="space-y-2">
                  {booking.guestCheckInAccess.map((guestAccess, index) => (
                    <div
                      key={guestAccess.id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {guestAccess.customer.guestFirstName} {guestAccess.customer.guestLastName}
                            </span>
                            {guestAccess.isMainGuest && (
                              <span className="text-sm text-blue-500">👑</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {guestAccess.customer.guestEmail}
                            {guestAccess.customer.guestPhone && (
                              <span> • {guestAccess.customer.guestPhone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          window.location.href = `/admin/dashboard?sidebar=customers&customerid=${guestAccess.customer.id}`;
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No guest check-in details available for this room.</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowGuestsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}