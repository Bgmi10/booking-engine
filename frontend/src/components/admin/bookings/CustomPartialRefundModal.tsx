import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { PaymentIntent } from '../../../types/types';
import { baseUrl } from '../../../utils/constants';

interface CustomPartialRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentIntent: PaymentIntent;
  onRefundSuccess: () => void;
}

interface BookingRefundData {
  bookingId: string;
  roomName: string;
  originalAmount: number;
  refundAmount: number;
  currentRefundAmount: number;
  maxRefundable: number;
}

const CustomPartialRefundModal: React.FC<CustomPartialRefundModalProps> = ({
  isOpen,
  onClose,
  paymentIntent,
  onRefundSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [bookingRefunds, setBookingRefunds] = useState<BookingRefundData[]>([]);
  const [refundReason, setRefundReason] = useState('');
  const [totalRefundAmount, setTotalRefundAmount] = useState(0);
  const [fetchingBookings, setFetchingBookings] = useState(false);

  useEffect(() => {
    const fetchBookingData = async () => {
      if (isOpen && paymentIntent.id) {
        setFetchingBookings(true);
        try {
          // Fetch actual booking records from the database
          const response = await fetch(`${baseUrl}/admin/payment-intents/${paymentIntent.id}/bookings`, {
            credentials: "include"
          });
          
          if (response.ok) {
            const result = await response.json();
            const bookings = result.data || [];
            
            // Initialize booking refund data using fetched booking records
            const initialBookingRefunds = bookings.map((booking: any) => {
              const originalAmount = booking.totalAmount || 0;
              const currentRefundAmount = booking.refundAmount || 0;
              
              return {
                bookingId: booking.bookingId,
                roomName: booking.roomName,
                originalAmount: originalAmount,
                refundAmount: 0,
                currentRefundAmount: currentRefundAmount,
                maxRefundable: Math.max(0, originalAmount - currentRefundAmount)
              };
            });
            
            setBookingRefunds(initialBookingRefunds);
          } else {
            toast.error('Failed to fetch booking data');
          }
        } catch (error) {
          console.error('Error fetching booking data:', error);
          toast.error('Failed to fetch booking data');
        } finally {
          setFetchingBookings(false);
        }
        
        setRefundReason('');
        setTotalRefundAmount(0);
      }
    };
    
    fetchBookingData();
  }, [isOpen, paymentIntent.id]);


  const handleRefundAmountChange = (bookingId: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    
    setBookingRefunds(prev => 
      prev.map(booking => 
        booking.bookingId === bookingId 
          ? { ...booking, refundAmount: numAmount }
          : booking
      )
    );

    // Calculate total refund amount
    const newTotal = bookingRefunds.reduce((total, booking) => {
      if (booking.bookingId === bookingId) {
        return total + numAmount;
      }
      return total + booking.refundAmount;
    }, 0);
    
    setTotalRefundAmount(newTotal);
  };

  const handleSubmit = async () => {
    if (totalRefundAmount <= 0) {
      toast.error('Please enter a refund amount greater than 0');
      return;
    }

    if (!refundReason.trim()) {
      toast.error('Please provide a reason for the refund');
      return;
    }

    // Validate refund amounts don't exceed limits
    const invalidBookings = bookingRefunds.filter(booking => 
      booking.refundAmount > booking.maxRefundable
    );

    if (invalidBookings.length > 0) {
      toast.error('Refund amount exceeds available refundable amount for some bookings');
      return;
    }

    setLoading(true);

    try {
      // Process refunds for each booking with a refund amount
      const refundPromises = bookingRefunds
        .filter(booking => booking.refundAmount > 0)
        .map(async (booking) => {
          const response = await fetch(`${baseUrl}/admin/bookings/custom-partial-refund`, {
            method: 'POST',
            credentials: "include",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bookingId: booking.bookingId,
              refundAmount: booking.refundAmount,
              reason: refundReason
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to process refund');
          }

          return response.json();
        });

      await Promise.all(refundPromises);

      toast.success(`Custom partial refund of €${totalRefundAmount.toFixed(2)} processed successfully`);
      onRefundSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error processing custom partial refund:', error);
      toast.error(error.message || 'Failed to process custom partial refund');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Custom Partial Refund</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Payment Intent Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Payment Intent Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Customer:</span>
                <span className="ml-2 font-medium">
                  {`${paymentIntent.customerData.firstName} ${paymentIntent.customerData.middleName || ''} ${paymentIntent.customerData.lastName}`.trim()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <span className="ml-2 font-medium">€{paymentIntent.totalAmount}</span>
              </div>
              <div>
                <span className="text-gray-600">Payment Method:</span>
                <span className="ml-2 font-medium">{paymentIntent.actualPaymentMethod || paymentIntent.paymentMethod}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium">{paymentIntent.status}</span>
              </div>
            </div>
          </div>

          {/* Booking Refunds */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-4">Select Rooms and Refund Amounts</h3>
            {fetchingBookings ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading booking data...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingRefunds.map((booking) => (
                <div key={booking.bookingId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{booking.roomName}</h4>
                      <p className="text-sm text-gray-600">Booking ID: {booking.bookingId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Original: €{booking.originalAmount}</p>
                      <p className="text-sm text-gray-600">Already Refunded: €{booking.currentRefundAmount}</p>
                      <p className="text-sm font-medium text-green-600">Max Refundable: €{booking.maxRefundable}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">Refund Amount:</label>
                    <div className="flex-1 max-w-32">
                      <input
                        type="number"
                        min="0"
                        max={booking.maxRefundable}
                        step="0.01"
                        value={booking.refundAmount || ''}
                        onChange={(e) => handleRefundAmountChange(booking.bookingId, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <span className="text-sm text-gray-600">€</span>
                  </div>
                  
                  {booking.refundAmount > booking.maxRefundable && (
                    <div className="mt-2 flex items-center text-red-600 text-sm">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Exceeds maximum refundable amount
                    </div>
                  )}
                </div>
                ))}
              </div>
            )}
          </div>

          {/* Refund Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refund Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter the reason for this partial refund..."
              required
            />
          </div>

          {/* Total Refund Summary */}
          {totalRefundAmount > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Total Refund Amount:</span>
                </div>
                <span className="text-xl font-bold text-blue-900">€{totalRefundAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || fetchingBookings || totalRefundAmount <= 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : fetchingBookings ? 'Loading...' : `Process Refund (€${totalRefundAmount.toFixed(2)})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPartialRefundModal;