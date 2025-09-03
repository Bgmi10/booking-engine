import { useState, useEffect } from 'react';
import { X, ExternalLink, User, CreditCard, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';

interface PaymentIntent {
  id: string;
  status: string;
  totalAmount: number;
  customer?: {
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
  };
  bookings?: Array<{
    id: string;
    checkIn: string;
    checkOut: string;
    room?: {
      name: string;
    };
  }>;
}

interface BookingGroup {
  id: string;
  groupName?: string;
  mainGuest?: {
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
  };
  paymentIntents: PaymentIntent[];
}

interface PaymentIntentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingGroup: BookingGroup;
}

export default function PaymentIntentSelectionModal({
  isOpen,
  onClose,
  bookingGroup
}: PaymentIntentSelectionModalProps) {
  const [selectedPaymentIntentId, setSelectedPaymentIntentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter only confirmed payment intents
  const confirmedPaymentIntents = bookingGroup.paymentIntents.filter(
    pi => pi.status === 'SUCCEEDED'
  );

  useEffect(() => {
    // Pre-select if only one payment intent
    if (confirmedPaymentIntents.length === 1) {
      setSelectedPaymentIntentId(confirmedPaymentIntents[0].id);
    }
  }, [confirmedPaymentIntents]);

  const handleAccessPortal = async () => {
    if (!selectedPaymentIntentId) {
      toast.error('Please select a booking');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intents/${selectedPaymentIntentId}/checkin-url`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.data?.checkinUrl) {
        // Open check-in portal in new tab
        window.open(data.data.checkinUrl, '_blank');
        toast.success('Check-in portal opened in new tab');
        onClose();
      } else {
        toast.error(data.message || 'Failed to get check-in URL');
      }
    } catch (error) {
      console.error('Error accessing check-in portal:', error);
      toast.error('Failed to access check-in portal');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getCustomerName = (paymentIntent: PaymentIntent) => {
    // Try to get customer from payment intent first
    if (paymentIntent.customer) {
      return `${paymentIntent.customer.guestFirstName} ${paymentIntent.customer.guestLastName}`;
    }
    // Fallback to main guest from booking group
    if (bookingGroup.mainGuest) {
      return `${bookingGroup.mainGuest.guestFirstName} ${bookingGroup.mainGuest.guestLastName}`;
    }
    return 'Unknown Guest';
  };

  const getCustomerEmail = (paymentIntent: PaymentIntent) => {
    if (paymentIntent.customer) {
      return paymentIntent.customer.guestEmail;
    }
    if (bookingGroup.mainGuest) {
      return bookingGroup.mainGuest.guestEmail;
    }
    return 'No email available';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Select Booking to Access
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {confirmedPaymentIntents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No confirmed bookings found in this group
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                This group contains {confirmedPaymentIntents.length} booking(s) with different customers. 
                Select which customer's check-in portal you want to access:
              </p>

              <div className="space-y-3">
                {confirmedPaymentIntents.map((paymentIntent) => {
                  const isSelected = selectedPaymentIntentId === paymentIntent.id;
                  const customerName = getCustomerName(paymentIntent);
                  const customerEmail = getCustomerEmail(paymentIntent);
                  const firstBooking = paymentIntent.bookings?.[0];
                  
                  return (
                    <div
                      key={paymentIntent.id}
                      onClick={() => setSelectedPaymentIntentId(paymentIntent.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Customer Info */}
                          <div className="flex items-center mb-2">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium text-gray-900">
                              {customerName}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center">
                              <span className="text-xs">{customerEmail}</span>
                            </div>
                            
                            {firstBooking && (
                              <div className="flex items-center mt-2">
                                <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-xs">
                                  Check-in: {format(new Date(firstBooking.checkIn), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            )}
                            
                            {paymentIntent.bookings && paymentIntent.bookings.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {paymentIntent.bookings.length} room(s): {
                                  paymentIntent.bookings.map(b => b.room?.name || 'Unknown').join(', ')
                                }
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Selection indicator */}
                        <div className={`ml-4 mt-1 ${isSelected ? 'visible' : 'invisible'}`}>
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Booking ID for reference */}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400">
                          Booking ID: {paymentIntent.id.slice(-8)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccessPortal}
            disabled={!selectedPaymentIntentId || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Loading...
              </span>
            ) : (
              <>
                Access Selected Portal
                <ExternalLink className="h-3 w-3 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}