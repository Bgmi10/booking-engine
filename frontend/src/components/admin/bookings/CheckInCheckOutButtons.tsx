import { useState } from 'react';
import { LogIn, LogOut, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';
import ChargeModal from '../customers/ChargeModal';
import type { Customer } from '../../../hooks/useCustomers';

interface CheckInCheckOutButtonsProps {
  type: 'booking' | 'paymentIntent' | 'bookingGroup';
  id: string;
  bookings?: any[];
  isCheckedIn?: boolean;
  customer: Customer;
  isCheckedOut?: boolean;
  checkInDate?: string;
  checkOutDate?: string;
  outstandingAmount?: number;
  paymentStructure?: 'FULL_PAYMENT' | 'SPLIT_PAYMENT';
  paymentIntentId: string;
  paymentDetails?: {
    totalAmount: number;
    prepaidAmount: number;
    remainingAmount: number;
  };
  disabled?: boolean;
  onSuccess?: () => void;
  onRefresh?: () => void;
  variant?: 'compact' | 'full';
  className?: string;
}

interface CheckInOutResult {
  success: boolean;
  message: string;
  processedBookings: number;
  emailsSent: number;
}

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
  </svg>
);

export default function CheckInCheckOutButtons({
  customer,
  paymentIntentId,
  type,
  id,
  bookings = [],
  isCheckedIn = false,
  isCheckedOut = false,
  checkInDate,
  checkOutDate,
  outstandingAmount = 0,
  paymentStructure,
  paymentDetails,
  disabled = false,
  onSuccess,
  onRefresh,
  variant = 'full',
  className = ''
}: CheckInCheckOutButtonsProps) {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showEmailOptions, setShowEmailOptions] = useState(false);
  const [sendEmailToAll, setSendEmailToAll] = useState(false);
  const [currentAction, setCurrentAction] = useState<'checkin' | 'checkout' | null>(null);
  const [showOutstandingWarning, setShowOutstandingWarning] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);

  // Check if today matches a given date
  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    
    // Set both dates to start of day for accurate comparison
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    return date.getTime() === today.getTime();
  };

  // Determine if check-in should be available
  const canCheckIn = () => {
    if (type === 'booking') {
      return !isCheckedIn && isToday(checkInDate);
    }
    if (type === 'paymentIntent' || type === 'bookingGroup') {
      return bookings.some(booking => !booking.checkedInAt && isToday(booking.checkIn));
    }
    return false;
  };

  // Determine if check-out should be available
  const canCheckOut = () => {
    if (type === 'booking') {
      return isCheckedIn && !isCheckedOut && isToday(checkOutDate);
    }
    if (type === 'paymentIntent' || type === 'bookingGroup') {
      return bookings.some(booking => booking.checkedInAt && !booking.checkedOutAt && isToday(booking.checkOut)) && outstandingAmount === 0;
    }
    return false;
  };

  // Get API endpoint
  const getEndpoint = (action: 'checkin' | 'checkout') => {
    const actionPath = action === 'checkin' ? 'check-in' : 'check-out';
    
    switch (type) {
      case 'booking':
        return `${baseUrl}/admin/bookings/${actionPath}`;
      case 'paymentIntent':
        return `${baseUrl}/admin/payment-intents/${actionPath}`;
      case 'bookingGroup':
        return `${baseUrl}/admin/booking-groups/${actionPath}`;
      default:
        throw new Error('Invalid check-in/out type');
    }
  };

  // Handle check-in - show appropriate modal
  const handleCheckInClick = () => {
    if (paymentStructure === 'SPLIT_PAYMENT') {
      setShowOutstandingWarning(true);
    } else {
      setShowCheckInModal(true);
    }
  };

  // Proceed with check-in after split payment acknowledgment
  const proceedWithCheckIn = () => {
    setShowOutstandingWarning(false);
    handleAction('checkin');
  };

  // Handle check-in/checkout
  const handleAction = async (action: 'checkin' | 'checkout') => {
    if (action === 'checkin') {
      setIsCheckingIn(true);
    } else {
      setIsCheckingOut(true);
    }

    try {
      const payload = type === 'booking' 
        ? { bookingId: id, adminNotes: adminNotes || undefined, ...(action === 'checkout' ? { sendEmailToAll } : {}) }
        : type === 'paymentIntent'
        ? { paymentIntentId: id, adminNotes: adminNotes || undefined, ...(action === 'checkout' ? { sendEmailToAll } : {}) }
        : { bookingGroupId: id, adminNotes: adminNotes || undefined, ...(action === 'checkout' ? { sendEmailToAll } : {}) };

      const response = await fetch(getEndpoint(action), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        const result: CheckInOutResult = data.data || data;
        
        if (action === 'checkin') {
          toast.success(result.message);
        } else {
          toast.success(
            `${result.message}. ${result.emailsSent || 0} email${(result.emailsSent || 0) !== 1 ? 's' : ''} sent.`
          );
        }

        // Call refresh callback after successful operation
        if (onRefresh) {
          onRefresh();
        }

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
      } else {
        toast.error(data.message || `Failed to ${action === 'checkin' ? 'check in' : 'check out'}`);
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      toast.error(`Failed to ${action === 'checkin' ? 'check in' : 'check out'}`);
    } finally {
      if (action === 'checkin') {
        setIsCheckingIn(false);
      } else {
        setIsCheckingOut(false);
      }
      setShowEmailOptions(false);
      setCurrentAction(null);
      setAdminNotes(''); // Reset admin notes after action
      setShowCheckInModal(false);
    }
  };

  // Show email options modal
  const showEmailOptionsModal = (action: 'checkin' | 'checkout') => {
    setCurrentAction(action);
    setShowEmailOptions(true);
  };

  // Handle confirm with email options
  const handleConfirmAction = () => {
    if (currentAction) {
      handleAction(currentAction);
    }
  };

  const isLoading = isCheckingIn || isCheckingOut;
  const showCheckIn = canCheckIn();
  const showCheckOut = canCheckOut();

  if (!showCheckIn && !showCheckOut) {
    return null;
  }

  // Outstanding amount warning for checkout
  const hasOutstanding = outstandingAmount > 0;



  if (variant === 'compact') {
    return (
      <>
      
        <div className={`flex gap-2 ${className}`}>
          {showCheckIn && (
            <button
              onClick={handleCheckInClick}
              disabled={disabled || isLoading}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 border border-green-600 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isCheckingIn ? <Spinner /> : <LogIn className="h-3 w-3 mr-1" />}
              Check In
            </button>
          )}

          {showCheckOut && (
            <button
              onClick={() => showEmailOptionsModal('checkout')}
              disabled={disabled || isLoading}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isCheckingOut ? <Spinner /> : <LogOut className="h-3 w-3 mr-1" />}
              Check Out
            </button>
          )}
        </div>

        {/* Email Options Modal */}
        {showChargeModal  && (
        <ChargeModal
         step='create_payment'
          customer={customer}
          paymentIntentId={paymentIntentId}
          onClose={async () => {
            setShowChargeModal(false);
          }}
        />
      )}
      
        {!showChargeModal && showEmailOptions && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className='flex justify-between'>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Check-Out
                </h3>
               {hasOutstanding && <span className=''>
                  Oustanding Amount: <span className='text-red-500 font-bold'>{hasOutstanding ? outstandingAmount : ""}€</span>
                  <aside className='mt-2 mb-2 text-end'>{ outstandingAmount && <button onClick={() => setShowChargeModal(true)} className='bg-blue-500 p-2 cursor-pointer text-white rounded-md'>Collect Amount</button>}</aside>
                </span>}
              </div>
             
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    id="email-all"
                    type="checkbox"
                    checked={sendEmailToAll}
                    onChange={(e) => setSendEmailToAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div>
                    <label htmlFor="email-all" className="text-sm font-medium text-gray-900">
                      Send thank you email to all guests
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {sendEmailToAll 
                        ? 'Will send thank you email to all guests in this booking'
                        : 'Will send thank you email only to the main guest'
                      }
                    </p>  
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>
                    Thank you email will be sent to selected guests after checkout
                  </span>
                </div>
                
                <div className="mt-4">
                  <label htmlFor="checkout-notes-compact" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    id="checkout-notes-compact"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this checkout..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={handleConfirmAction}
                  disabled={isLoading || hasOutstanding}
                  className={`${hasOutstanding ? "cursor-not-allowed" : "cursor-pointer"} flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                >
                  {isLoading ? <Spinner /> : null}
                  Confirm Check Out
                </button>
                <button
                  onClick={() => setShowEmailOptions(false)}
                  disabled={isLoading}
                  className="cursor-pointer flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Check-In Modal for regular bookings */}
        {showCheckInModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Check-In Confirmation
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  You are about to check in this {type === 'booking' ? 'booking' : type === 'paymentIntent' ? 'payment intent group' : 'booking group'}.
                </p>
                
                <div className="mt-4">
                  <label htmlFor="checkin-notes-modal" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    id="checkin-notes-modal"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this check-in..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => handleAction('checkin')}
                  disabled={isLoading}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isLoading ? <Spinner /> : null}
                  Confirm Check In
                </button>
                <button
                  onClick={() => {
                    setShowCheckInModal(false);
                    setAdminNotes('');
                  }}
                  disabled={isLoading}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split Payment Notice Modal */}
        {showOutstandingWarning && paymentStructure === 'SPLIT_PAYMENT' && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Split Payment Check-In
                  </h3>
                </div>
              </div>
              
              <div className="mt-2">
                {paymentDetails ? (
                  <>
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">Payment Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Booking Amount:</span>
                          <span className="font-medium">€{paymentDetails.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Prepaid Amount:</span>
                          <span className="font-medium text-green-600">
                            €{paymentDetails.prepaidAmount.toFixed(2)} 
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-gray-600 font-medium">Balance Due at Check-in:</span>
                          <span className="font-medium text-red-500">€{paymentDetails.remainingAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Important:</strong> Please collect the balance of <strong>€{paymentDetails.remainingAmount.toFixed(2)}</strong> from the guest before providing room access.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-700">
                      This is a split payment booking. The guest paid a portion upfront and the balance is due at check-in.
                    </p>
                  </div>
                )}
                
                <div className="mt-4">
                  <label htmlFor="checkin-notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    id="checkin-notes"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this check-in..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={proceedWithCheckIn}
                  disabled={isLoading}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isLoading ? <Spinner /> : null}
                  Proceed with Check In
                </button>
                <button
                  onClick={() => setShowOutstandingWarning(false)}
                  disabled={isLoading}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Full variant (for detail views)
  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {showCheckIn && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-green-800">Ready for Check-In</h4>
                <p className="text-xs text-green-600 mt-1">
                  {type === 'booking' ? 'Guest can be checked in' : 'Multiple bookings ready for check-in'}
                </p>
              </div>
              <button
                onClick={handleCheckInClick}
                disabled={disabled || isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isCheckingIn ? <Spinner /> : <LogIn className="h-4 w-4 mr-2" />}
                Check In {type !== 'booking' ? 'All' : ''}
              </button>
            </div>
          </div>
        )}

        {showCheckOut && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-800">Ready for Check-Out</h4>
                <p className="text-xs text-blue-600 mt-1">
                  {type === 'booking' ? 'Guest is checked in and can check out' : 'Multiple bookings ready for check-out'}
                </p>
              </div>
              <button
                onClick={() => showEmailOptionsModal('checkout')}
                disabled={disabled || isLoading || hasOutstanding}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                title={hasOutstanding ? `Cannot checkout. Outstanding amount: €${outstandingAmount}` : ''}
              >
                {isCheckingOut ? <Spinner /> : <LogOut className="h-4 w-4 mr-2" />}
                Check Out {type !== 'booking' ? 'All' : ''}
              </button>
            </div>
            
            {hasOutstanding && (
              <div className="mt-3 flex items-center text-xs text-amber-700">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Outstanding amount of €{outstandingAmount} must be resolved before checkout
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Options Modal - Same as compact version */}
      {showEmailOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Check-Out Options
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  id="email-all-full"
                  type="checkbox"
                  checked={sendEmailToAll}
                  onChange={(e) => setSendEmailToAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div>
                  <label htmlFor="email-all-full" className="text-sm font-medium text-gray-900">
                    Send thank you email to all guests
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {sendEmailToAll 
                      ? 'Will send thank you email to all guests with check-in access'
                      : 'Will send thank you email only to the main guest'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>
                  Thank you email will be sent to selected guests after checkout
                </span>
              </div>
              
              <div className="mt-4">
                <label htmlFor="checkout-notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  id="checkout-notes"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this checkout..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={handleConfirmAction}
                disabled={isLoading}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? <Spinner /> : null}
                Confirm Check Out
              </button>
              <button
                onClick={() => setShowEmailOptions(false)}
                disabled={isLoading}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}