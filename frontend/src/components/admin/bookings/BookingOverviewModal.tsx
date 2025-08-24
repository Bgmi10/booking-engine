import { useState, useEffect, useMemo } from 'react';
import { X, CreditCard, FileText, AlertCircle, Plus, User, RefreshCw, Filter, Info, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import OrderDetailsModal from '../customers/OrderDetailsModal';
import ChargeModal from '../customers/ChargeModal';
import CreatorInfoModal from '../customers/CreatorInfoModal';
import ChargeRefundModal from '../shared/ChargeRefundModal';
import type { Customer } from '../../../hooks/useCustomers';
import type { Charge } from '../../../types/types';

interface BookingOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentIntent: any;
  onRefresh?: () => void;
}

export default function BookingOverviewModal({ isOpen, onClose, paymentIntent, onRefresh }: BookingOverviewModalProps) {
  const [activeTab, setActiveTab] = useState<'payments' | 'orders'>('payments');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [creatorIdForModal, setCreatorIdForModal] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedChargeForRefund, setSelectedChargeForRefund] = useState<Charge | null>(null);
  const [showRefundDetailsModal, setShowRefundDetailsModal] = useState(false);
  const [selectedChargeForRefundDetails, setSelectedChargeForRefundDetails] = useState<Charge | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  // Get orders directly from paymentIntent data
  const allOrders = paymentIntent?.orders || [];
  const roomOrders = allOrders.filter((order: any) => order.paymentIntentId === paymentIntent?.id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  
  const allCharges = paymentIntent?.charges || [];
  
  // Filter charges based on selected filters
  const charges = useMemo(() => {
    return allCharges.filter((charge: Charge) => {
      const matchesStatus = statusFilter === 'ALL' || charge.status === statusFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'ALL' || 
        (charge.paymentMethod ? 
          charge.paymentMethod.replace('_', ' ').toUpperCase() === paymentMethodFilter ||
          charge.paymentMethod.toUpperCase() === paymentMethodFilter
        : paymentMethodFilter === 'ROOM CHARGE');
      return matchesStatus && matchesPaymentMethod;
    });
  }, [allCharges, statusFilter, paymentMethodFilter]);

  // Check if booking payment should be shown based on filters
  const showBookingPayment = useMemo(() => {
    if (!paymentIntent?.status || paymentIntent.status !== 'SUCCEEDED') return false;
    
    const bookingStatus = 'SUCCEEDED';
    const bookingMethod = paymentIntent.paymentMethod || 'STRIPE';
    
    const matchesStatus = statusFilter === 'ALL' || bookingStatus === statusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'ALL' || 
      bookingMethod.toUpperCase() === paymentMethodFilter;
      
    return matchesStatus && matchesPaymentMethod;
  }, [paymentIntent?.status, paymentIntent?.paymentMethod, statusFilter, paymentMethodFilter]);

  // Parse customer data from the PaymentIntent structure
  useEffect(() => {
    if (paymentIntent) {
      if (paymentIntent.customer) {
        setCustomer(paymentIntent.customer);
      } else if (paymentIntent.customerData) {
        // Create a customer object from customerData
        setCustomer({
          id: paymentIntent.customerId || '',
          guestFirstName: paymentIntent.customerData.firstName,
          guestMiddleName: paymentIntent.customerData.middleName,
          guestLastName: paymentIntent.customerData.lastName,
          guestEmail: paymentIntent.customerData.email,
          guestPhone: paymentIntent.customerData.phone,
          guestNationality: paymentIntent.customerData.nationality,
          stripeCustomerId: paymentIntent.customerData.stripeCustomerId,
          // Add other required fields with defaults
          vipStatus: false,
          totalNightStayed: 0,
          totalMoneySpent: 0,
          accountActivated: false,
          emailVerified: false,
          createdAt: paymentIntent.createdAt,
          updatedAt: paymentIntent.updatedAt,
        } as Customer);
      }
    }
  }, [paymentIntent]);

  // Function to refresh payment intent data from parent
  const refreshPaymentIntentData = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh(); // Refresh parent data (includes orders)
      } finally {
        setIsRefreshing(false);
      }
    }
  };


  
  // Handle charge refund
  const handleChargeRefund = (charge: Charge) => {
    setSelectedChargeForRefund(charge);
    setShowRefundModal(true);
  };

  // Handle refund details view
  const handleViewRefundDetails = (charge: Charge) => {
    setSelectedChargeForRefundDetails(charge);
    setShowRefundDetailsModal(true);
  };

  const onRefundSuccess = async () => {
    await refreshPaymentIntentData();
  };

  const outstandingBalance = paymentIntent?.outstandingAmount || 0;
  const paidAmount = (paymentIntent?.totalAmount || 0) - outstandingBalance;

  const handleAddPayment = () => {
    setShowChargeModal(true);
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col relative">
        {/* Loading Overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600 font-medium">Refreshing data...</p>
            </div>
          </div>
        )}
        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Booking Overview</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {customer?.guestFirstName} {customer?.guestLastName} • #{paymentIntent?.id.slice(-8)}
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isRefreshing}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Outstanding Balance Alert - More Compact */}
        {outstandingBalance > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-900">Outstanding Balance</p>
                  <p className="text-xs text-amber-700">Payment required</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-900">€{outstandingBalance.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Compact Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'payments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Payments & Charges
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'orders'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Room Orders
          </button>
        </div>

        {/* Content - Reduced Padding */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'payments' && (
            <div className="space-y-2">
              {/* Payment Summary Header - Compact */}
              <div className="bg-gray-50 rounded-md p-2.5 mb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-xs font-semibold">€{paymentIntent?.totalAmount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Paid</p>
                      <p className="text-xs font-semibold text-green-600">
                        €{paidAmount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Outstanding</p>
                      <p className={`text-xs font-semibold ${outstandingBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        €{outstandingBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddPayment}
                      disabled={isRefreshing}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Payment
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Controls */}
              {allCharges.length > 0 && (
                <div className="bg-gray-50 rounded-md p-2.5 mb-2 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-xs font-medium text-gray-700">Filters:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="SUCCEEDED">Succeeded</option>
                        <option value="FAILED">Failed</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="REFUNDED">Refunded</option>
                      </select>
                      <select
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="ALL">All Methods</option>
                        <option value="CARD">Card</option>
                        <option value="CASH">Cash</option>
                        <option value="QR_CODE">QR Code</option>
                        <option value="HOSTED_INVOICE">Hosted Invoice</option>
                        <option value="MANUAL_TRANSACTION">Manual Transaction</option>
                        <option value="ROOM CHARGE">Room Charge</option>
                        <option value="STRIPE">Stripe</option>
                      </select>
                      {(statusFilter !== 'ALL' || paymentMethodFilter !== 'ALL') && (
                        <button
                          onClick={() => {
                            setStatusFilter('ALL');
                            setPaymentMethodFilter('ALL');
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="ml-auto text-xs text-gray-500">
                      {charges.length} of {allCharges.length} charges
                    </div>
                  </div>
                </div>
              )}
              
              {charges.length === 0 && allCharges.length === 0 && paymentIntent?.status !== 'SUCCEEDED' ? (
                <div className="text-center py-6">
                  <CreditCard className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs font-medium text-gray-900">No payments found</p>
                  <p className="text-xs text-gray-600 mt-0.5">No charges or payments have been recorded yet.</p>
                </div>
              ) : charges.length === 0 && allCharges.length > 0 ? (
                <div className="text-center py-6">
                  <Filter className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs font-medium text-gray-900">No charges match your filters</p>
                  <p className="text-xs text-gray-600 mt-0.5">Try adjusting or clearing the filters above.</p>
                  <button
                    onClick={() => {
                      setStatusFilter('ALL');
                      setPaymentMethodFilter('ALL');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Show payment intent as a payment if succeeded and matches filters - Compact */}
                  {showBookingPayment && (
                    <div className="rounded-md p-2.5 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-900">Booking Payment</p>
                            <p className="text-xs text-gray-600">
                              {paymentIntent.paidAt ? format(new Date(paymentIntent.paidAt), 'MMM dd, HH:mm') : 'Payment date unknown'}
                            </p>
                          </div>
                          <div className="border-l pl-3">
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className="text-xs font-medium">€{paymentIntent.totalAmount}</p>
                          </div>
                          <div className="border-l pl-3">
                            <p className="text-xs text-gray-500">Method</p>
                            <p className="text-xs font-medium">{paymentIntent.paymentMethod || 'STRIPE'}</p>
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          SUCCEEDED
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show charges - Compact */}
                  {charges?.map((charge: Charge) => (
                    <div key={charge.id} className="bg-white rounded-md p-2.5 border border-gray-200 hover:border-gray-300 transition-colors group">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <p className="text-xs font-semibold text-gray-900">
                                {charge.description || `Charge #${charge.id.slice(-8)}`}
                              </p>
                              <p className="text-xs text-gray-600">
                                {format(new Date(charge.createdAt), 'MMM dd, HH:mm')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                charge.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' :
                                charge.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                                charge.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {charge.status}
                              </span>
                              <div className="flex items-center gap-1">
                                {charge.status === 'SUCCEEDED' && (
                                  <button
                                    onClick={() => handleChargeRefund(charge)}
                                    disabled={isRefreshing}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Refund charge"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </button>
                                )}
                                {charge.status === 'REFUNDED' && (charge.refundReason || charge.refundInitiatedBy || charge.refundedAt) && (
                                  <button
                                    onClick={() => handleViewRefundDetails(charge)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600 rounded"
                                    title="View refund details"
                                  >
                                    <Info className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <div>
                              <span className="text-gray-500">Amount:</span>
                              <span className="font-medium text-gray-900 ml-1">
                                {charge.currency ? `${charge.currency.toUpperCase()} ` : '€'}{charge.amount}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Method:</span>
                              <span className="font-medium text-gray-900 ml-1">
                                {charge.paymentMethod ? charge.paymentMethod.replace('_', ' ') : 'Room Charge'}
                              </span>
                            </div>
                            {charge.orderId && (
                              <button
                                onClick={() => setSelectedOrderId(charge.orderId!)}
                                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-0.5"
                              >
                                <FileText className="h-3 w-3" />
                                Order
                              </button>
                            )}
                            {charge.createdBy && (
                              <button
                                onClick={() => setCreatorIdForModal(charge.createdBy)}
                                className="text-gray-600 hover:text-gray-700 font-medium"
                              >
                                <User className="h-3 w-3 inline" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-2">
              {/* Room Orders Tab Content */}
              {roomOrders.length === 0 ? (
                <div className="text-center py-6">
                  <div className="h-12 w-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-gray-900">No room orders found</p>
                  <p className="text-xs text-gray-600 mt-0.5">No items have been added to this booking's tab yet.</p>
                </div>
              ) : (
                <>
                  {/* Orders Summary */}
                  <div className="bg-green-50 rounded-md p-2.5 mb-3 border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-medium text-green-900">Room Orders Summary</h4>
                        <p className="text-xs text-green-700 mt-0.5">{roomOrders.length} orders • Added to booking tab</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-900">
                          €{roomOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600">Total value</p>
                      </div>
                    </div>
                  </div>

                  {/* Individual Orders */}
                  <div className="space-y-2">
                    {roomOrders.map((order: any) => (
                      <div key={order.id} 
                           className="bg-white rounded-md p-3 border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                           onClick={(e) => {
                             // Only open order details if not clicking on the dropdown
                             if (!(e.target as HTMLElement).closest('button')) {
                               setSelectedOrderId(order.id);
                             }
                           }}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="text-xs font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                                Order #{order.id.slice(-6)} 
                                <span className="text-xs text-gray-500 ml-1">• Click for details</span>
                              </h5>
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {format(new Date(order.createdAt), 'MMM dd, yyyy • HH:mm')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-gray-900">€{order.total}</p>
                          </div>
                        </div>

                        {/* Order Items Dropdown */}
                        {order.items && order.items.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOrderExpansion(order.id);
                              }}
                              className="w-full flex items-center justify-between text-xs group hover:bg-gray-50 rounded p-1 -m-1 transition-all duration-200"
                            >
                              <div className="flex items-center gap-1.5">
                                <ShoppingBag className="h-3.5 w-3.5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                                <span className="font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                  {order.items.length} Item{order.items.length > 1 ? 's' : ''}
                                </span>
                                <span className="text-gray-500">
                                  • €{order.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0).toFixed(2)}
                                </span>
                              </div>
                              <div className={`transform transition-transform duration-200 ${expandedOrders.has(order.id) ? 'rotate-180' : ''}`}>
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
                              </div>
                            </button>
                            
                            {/* Expanded Items List */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              expandedOrders.has(order.id) ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
                            }`}>
                              <div className="space-y-1.5 bg-gray-50 rounded-md p-2">
                                {order.items.map((item: any, index: number) => {
                                  const totalPrice = (item.price || 0) * (item.quantity || 1);
                                  const taxAmount = item.tax ? (totalPrice * item.tax / (100 + item.tax)) : 0;
                                  
                                  return (
                                    <div key={index} className="bg-white rounded p-2 shadow-sm">
                                      <div className="flex justify-between items-start mb-1">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500">{item.quantity || 1}x</span>
                                            <span className="text-xs font-medium text-gray-800">{item.name}</span>
                                          </div>
                                        </div>
                                        <div className="text-xs font-medium text-gray-900">
                                          €{totalPrice.toFixed(2)}
                                        </div>
                                      </div>
                                      {item.tax > 0 && (
                                        <div className="ml-4 pt-1 border-t border-gray-100">
                                          <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span className='text-xs'>VAT {item.tax}%</span>
                                            <span>€{taxAmount.toFixed(2)}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
  
      {showChargeModal && customer && (
        <ChargeModal
         step='create_payment'
          customer={customer}
          paymentIntentId={paymentIntent?.id}
          onClose={async () => {
            setShowChargeModal(false);
            await refreshPaymentIntentData();
          }}
        />
      )}

      {creatorIdForModal && (
        <CreatorInfoModal 
          userId={creatorIdForModal} 
          onClose={() => setCreatorIdForModal(null)} 
        />
      )}
      
      <ChargeRefundModal
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setSelectedChargeForRefund(null);
        }}
        charge={selectedChargeForRefund}
        onRefundSuccess={onRefundSuccess}
      />

      {/* Refund Details Modal */}
      {showRefundDetailsModal && selectedChargeForRefundDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Refund Details</h2>
              <button
                onClick={() => {
                  setShowRefundDetailsModal(false);
                  setSelectedChargeForRefundDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Charge Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{selectedChargeForRefundDetails.currency?.toUpperCase() || 'EUR'} {selectedChargeForRefundDetails.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">{selectedChargeForRefundDetails.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="font-medium">{selectedChargeForRefundDetails.description || 'No description'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {selectedChargeForRefundDetails.refundReason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refund Reason</label>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-gray-900">{selectedChargeForRefundDetails.refundReason}</p>
                    </div>
                  </div>
                )}

                {selectedChargeForRefundDetails.refundedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refunded At</label>
                    <p className="text-sm text-gray-900 font-medium">
                      {format(new Date(selectedChargeForRefundDetails.refundedAt), 'MMM dd, yyyy at HH:mm')}
                    </p>
                  </div>
                )}

                {selectedChargeForRefundDetails.refundInitiatedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Refunded By</label>
                    <button 
                      onClick={() => {
                        setCreatorIdForModal(selectedChargeForRefundDetails?.refundInitiatedBy);
                        setShowRefundDetailsModal(false);
                        setSelectedChargeForRefundDetails(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                    >
                      View Admin Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}