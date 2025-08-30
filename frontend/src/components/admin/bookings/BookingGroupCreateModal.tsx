import { useState, useEffect } from 'react';
import { X, Save, Users, Search, AlertCircle, Crown } from 'lucide-react';
import { useBookingGroups } from '../../../hooks/useBookingGroups';
import { usePaymentIntents } from '../../../hooks/usePaymentIntents';
import { formatCurrency } from '../../../utils/helper';
import toast from 'react-hot-toast';

interface BookingGroupCreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingGroupCreateModal({ onClose, onSuccess }: BookingGroupCreateModalProps) {
  const [groupName, setGroupName] = useState('');
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentIntents, setSelectedPaymentIntents] = useState<string[]>([]);
  const [primaryGuestCustomerId, setPrimaryGuestCustomerId] = useState<string>('');
  const [bookingType, setBookingType] = useState('DIRECT');
  const [emailToMainGuestOnly, setEmailToMainGuestOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { createBookingGroup } = useBookingGroups();
  const { paymentIntents: allPaymentIntents, loading: loadingPaymentIntents } = usePaymentIntents();

  // Filter available payment intents (not already in groups)
  const availablePaymentIntents = (allPaymentIntents || []).filter(pi => !pi.bookingGroupId);

  const filteredPaymentIntents = availablePaymentIntents.filter(pi => {
    if (!searchTerm) return true;
    const customer = pi.customer || pi.customerData;
    return (
      customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.guestFirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.guestLastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.guestEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const selectedPaymentIntentData = availablePaymentIntents.filter(pi => 
    selectedPaymentIntents.includes(pi.id)
  );

  // Auto-clear primary guest if they're no longer in selected payment intents
  useEffect(() => {
    if (primaryGuestCustomerId) {
      // Use the same logic as in the UI - check against customerId
      const isStillSelected = selectedPaymentIntentData.some(pi => pi.customerId === primaryGuestCustomerId);
      if (!isStillSelected) {
        setPrimaryGuestCustomerId('');
      }
    }
  }, [selectedPaymentIntents, primaryGuestCustomerId, selectedPaymentIntentData]);

  const totalSelectedAmount = selectedPaymentIntentData.reduce((sum, pi) => sum + pi.totalAmount, 0);
  const totalSelectedOutstanding = selectedPaymentIntentData.reduce((sum, pi) => sum + (pi.outstandingAmount || 0), 0);

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    if (selectedPaymentIntents.length === 0) {
      toast.error('Please select at least one payment intent');
      return;
    }

    if (!primaryGuestCustomerId) {
      toast.error('Please select a primary guest by checking the box next to their booking');
      return;
    }

    setIsLoading(true);
    try {
      await createBookingGroup({
        groupName: groupName.trim(),
        paymentIntentIds: selectedPaymentIntents,
        mainGuestId: primaryGuestCustomerId,
        reason: reason.trim() || 'Manual group creation via admin interface',
        bookingType,
        emailToMainGuestOnly
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePaymentIntentSelection = (paymentIntentId: string) => {
    setSelectedPaymentIntents(prev => 
      prev.includes(paymentIntentId)
        ? prev.filter(id => id !== paymentIntentId)
        : [...prev, paymentIntentId]
    );
  };

  const selectAll = () => {
    setSelectedPaymentIntents(filteredPaymentIntents.map(pi => pi.id));
  };

  const clearAll = () => {
    setSelectedPaymentIntents([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Create Booking Group
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Manually create a group from available payment intents
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group Details */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Group Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter group name"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Creation
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Optional reason for creating this group"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking Type
                  </label>
                  <select
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="DIRECT">Direct Booking</option>
                    <option value="BOOKING_COM">Booking.com</option>
                    <option value="EXPEDIA">Expedia</option>
                    <option value="AIRBNB">Airbnb</option>
                    <option value="WEDDING">Wedding</option>
                    <option value="PRIVATE_EVENT">Private Event</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailToMainGuestOnly}
                      onChange={(e) => setEmailToMainGuestOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Send all emails to primary guest only
                    </span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Selection Summary */}
          {selectedPaymentIntents.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Selected Summary</p>
                  <div className="mt-1 grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-blue-700">Payment Intents:</span>
                      <span className="ml-1 font-semibold">{selectedPaymentIntents.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Total Amount:</span>
                      <span className="ml-1 font-semibold">{formatCurrency(totalSelectedAmount)}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Outstanding:</span>
                      <span className="ml-1 font-semibold">{formatCurrency(totalSelectedOutstanding)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Intent Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Select Payment Intents ({availablePaymentIntents.length} available)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select bookings and check ✓ Primary Guest for the group leader
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  disabled={isLoading || filteredPaymentIntents.length === 0}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  disabled={isLoading || selectedPaymentIntents.length === 0}
                  className="text-xs text-gray-600 hover:text-gray-700 disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name, email, or payment intent ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Payment Intents List */}
            {loadingPaymentIntents ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-xs text-gray-600 mt-2">Loading bookings...</p>
              </div>
            ) : filteredPaymentIntents.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900">No bookings found</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'No available bookings (all may be in groups already)'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredPaymentIntents.filter((pi) => pi.status === "SUCCEEDED").map((pi) => {
                  const customer: any = {...pi.customerData, ...{ customerId: pi.customerId }};
                  const isSelected = selectedPaymentIntents.includes(pi.id);
                  const isPrimaryGuest = customer?.customerId === primaryGuestCustomerId;
                  return (
                    <div 
                      key={pi.id} 
                      className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50' : ''
                      } ${
                        isPrimaryGuest ? 'ring-2 ring-yellow-200 bg-yellow-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePaymentIntentSelection(pi.id)}
                          className="rounded border-gray-300"
                          disabled={isLoading}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {isPrimaryGuest && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                              <p className="text-sm font-medium text-gray-900">
                                {customer 
                                  ? `${customer.firstName || customer.guestFirstName || ''} ${customer.lastName || customer.guestLastName || ''}`.trim() || 'Unknown Customer'
                                  : 'Unknown Customer'
                                }
                              </p>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              pi.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' :
                              pi.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {pi.status}
                            </span>
                            {isPrimaryGuest && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Primary Guest
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            #{pi.id.slice(-8)} • {customer?.email || customer?.guestEmail || 'No email'}
                          </p>
                          {pi.bookings && pi.bookings.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {pi.bookings.length} booking{pi.bookings.length !== 1 ? 's' : ''} 
                              {pi.bookings.map(b => b.room?.name).filter(Boolean).length > 0 && 
                                ` (${pi.bookings.map(b => b.room?.name).filter(Boolean).join(', ')})`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Primary Guest Checkbox */}
                        {isSelected && customer && (
                          <div className="flex flex-col items-center">
                            <input
                              type="checkbox"
                              checked={isPrimaryGuest}
                              onChange={() => {
                                if (isPrimaryGuest) {
                                  setPrimaryGuestCustomerId('');
                                } else {
                                  setPrimaryGuestCustomerId(customer?.customerId);
                                }
                              }}
                              className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                              disabled={isLoading}
                            />
                            <span className="text-xs text-gray-600 mt-1 text-center">
                              Primary
                            </span>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(pi.totalAmount)}</p>
                          <p className={`text-xs ${(pi.outstandingAmount || 0) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                            Outstanding: {formatCurrency(pi.outstandingAmount || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-600">
            {selectedPaymentIntents.length > 0 
              ? `${selectedPaymentIntents.length} payment intent${selectedPaymentIntents.length !== 1 ? 's' : ''} selected`
              : 'No payment intents selected'
            }
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !groupName.trim() || selectedPaymentIntents.length === 0 || !primaryGuestCustomerId}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}