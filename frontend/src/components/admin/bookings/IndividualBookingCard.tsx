import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
} from "lucide-react";
import toast from 'react-hot-toast';
import { baseUrl } from "../../../utils/constants";

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
  room: {
    id: string;
    name: string;
    description: string;
  };
  customer: {
    id: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
  };
  paymentIntentId: string;
}

interface IndividualBookingCardProps {
  booking: Booking;
  onRefund?: (bookingId: string) => void;
  onViewDetails?: (bookingId: string) => void;
  showRefundButton?: boolean;
}

export default function IndividualBookingCard({
  booking,
  onRefund,
  onViewDetails,
  showRefundButton = true
}: IndividualBookingCardProps) {
  console.log(booking)
  const [showConfirmRefund, setShowConfirmRefund] = useState(false);
  const [loadingRefund, setLoadingRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');

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
          {format(new Date(booking.checkIn), 'MMM dd')} → {format(new Date(booking.checkOut), 'MMM dd, yyyy')}
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

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={() => onViewDetails?.(booking.id)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Details
        </button>

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
    </div>
  );
}