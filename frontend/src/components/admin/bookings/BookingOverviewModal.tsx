import { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, ShoppingCart, Calendar, MapPin, Users, Clock, DollarSign, FileText, AlertCircle, Plus, User } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import { format, differenceInDays } from 'date-fns';
import OrderDetailsModal from '../customers/OrderDetailsModal';
import ChargeModal from '../customers/ChargeModal';
import CreatorInfoModal from '../customers/CreatorInfoModal';
import { useUserInfo } from '../../../hooks/useUserInfo';
import type { Customer } from '../../../hooks/useCustomers';

interface BookingOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentIntent: any;
}

interface OrderData {
  id: string;
  items: any[];
  status: string;
  total: number;
  locationNames: string[];
  createdAt: string;
  deliveredAt?: string;
  charge?: any;
}

export default function BookingOverviewModal({ isOpen, onClose, paymentIntent }: BookingOverviewModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments'>('overview');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [charges, setCharges] = useState<[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [creatorIdForModal, setCreatorIdForModal] = useState<string | null>(null);
  
  // Get admin user info if booking was created by admin
  const adminUserId = paymentIntent?.createdByAdmin ? paymentIntent.adminUserId : null;
  const { userInfo: adminUserInfo } = useUserInfo(adminUserId);

  // Parse customer data and set orders/charges from the new structure
  useEffect(() => {
    if (paymentIntent && paymentIntent.customer) {
      setCustomer(paymentIntent.customer);
      // Set orders and charges from the customer object
      if (paymentIntent.orders) {
        setOrders(paymentIntent.orders);
      }
      if (paymentIntent.charges) {
        setCharges(paymentIntent.charges);
      }
    } else if (paymentIntent && paymentIntent.customerData) {
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
  }, [paymentIntent]);

  // Refresh charges after adding a new payment
  const refreshCharges = useCallback(async () => {
    if (!customer?.id) return;
    try {
      const response = await fetch(`${baseUrl}/admin/customers/${customer.id}/charge-payments`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCharges(data.data?.charges || []);
      }
    } catch (error) {
      console.error('Error fetching charges:', error);
    }
  }, [customer?.id]);

  // Calculate outstanding balance
  const calculateOutstandingBalance = () => {
    const totalAmount = paymentIntent?.totalAmount || 0;
    const paidCharges = charges.filter(c => c.status === 'SUCCEEDED' || c.status === 'PAID')
      .reduce((sum, charge) => sum + charge.amount, 0);
    
    // If payment intent is already succeeded, include that amount as paid
    const paymentIntentPaid = paymentIntent?.status === 'SUCCEEDED' ? paymentIntent.totalAmount : 0;
    
    return totalAmount - paidCharges - paymentIntentPaid;
  };

  const outstandingBalance = calculateOutstandingBalance();

  const handleAddPayment = () => {
    setShowChargeModal(true);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Booking Overview</h2>
            <p className="text-sm text-gray-600 mt-1">
              {customer?.guestFirstName} {customer?.guestLastName} • Booking #{paymentIntent?.id.slice(-8)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Outstanding Balance Alert */}
        {outstandingBalance > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Outstanding Balance</p>
                  <p className="text-xs text-amber-700">Customer needs to pay the remaining amount</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-amber-900">€{outstandingBalance.toFixed(2)}</span>
                <button
                  onClick={handleAddPayment}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'payments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Payments & Charges
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Full Name</label>
                    <p className="font-medium text-gray-900">
                      {paymentIntent?.customerData?.firstName} {paymentIntent?.customerData?.middleName} {paymentIntent?.customerData?.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-medium text-gray-900">{paymentIntent?.customerData?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Phone</label>
                    <p className="font-medium text-gray-900">{paymentIntent?.customerData?.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Nationality</label>
                    <p className="font-medium text-gray-900">{paymentIntent?.customerData?.nationality || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Created By</label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {paymentIntent?.createdByAdmin ? (
                          adminUserInfo ? `${adminUserInfo.name} (${adminUserInfo.role})` : 'Admin'
                        ) : (
                          'Customer'
                        )}
                      </p>
                      {paymentIntent?.createdByAdmin && adminUserId && (
                        <button
                          onClick={() => setCreatorIdForModal(adminUserId)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <User className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Booking Details
                </h3>
                {paymentIntent?.bookingData?.map((booking: any, index: number) => {
                  const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn));
                  return (
                    <div key={index} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">Room</label>
                          <p className="font-medium text-gray-900">{booking.roomDetails?.name}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Duration</label>
                          <p className="font-medium text-gray-900">{nights} nights</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Check-in</label>
                          <p className="font-medium text-gray-900">
                            {format(new Date(booking.checkIn), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Check-out</label>
                          <p className="font-medium text-gray-900">
                            {format(new Date(booking.checkOut), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-medium text-gray-900">€{paymentIntent?.totalAmount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax Amount</span>
                    <span className="font-medium text-gray-900">€{paymentIntent?.taxAmount || 0}</span>
                  </div>
                  {paymentIntent?.voucherDiscount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voucher Discount</span>
                      <span className="font-medium text-green-600">-€{paymentIntent.voucherDiscount}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-semibold text-gray-900">Outstanding Balance</span>
                    <span className={`font-bold text-lg ${outstandingBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      €{outstandingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}


          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                <button
                  onClick={handleAddPayment}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </button>
              </div>
              
              {charges.length === 0 && paymentIntent?.status !== 'SUCCEEDED' ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                  <p className="text-gray-600">No charges or payments have been recorded for this booking yet.</p>
                </div>
              ) : (
                <>
                  {/* Show payment intent as a payment if succeeded */}
                  {paymentIntent?.status === 'SUCCEEDED' && (
                    <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Booking Payment</h4>
                          <p className="text-sm text-gray-600">
                            {paymentIntent.paidAt ? format(new Date(paymentIntent.paidAt), 'MMM dd, yyyy HH:mm') : 'Payment date unknown'}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          SUCCEEDED
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">Amount</label>
                          <p className="font-medium text-gray-900">€{paymentIntent.totalAmount}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Method</label>
                          <p className="font-medium text-gray-900">
                            {paymentIntent.paymentMethod || 'STRIPE'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show charges */}
                  {charges.map((charge) => (
                    <div key={charge.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {charge.description || `Charge #${charge.id.slice(-8)}`}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {format(new Date(charge.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          charge.status === 'SUCCEEDED' || charge.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          charge.status === 'REFUNDED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {charge.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm text-gray-600">Amount</label>
                          <p className="font-medium text-gray-900">
                            {charge.currency ? `${charge.currency.toUpperCase()} ` : '€'}{charge.amount}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Method</label>
                          <p className="font-medium text-gray-900">
                            {charge.paymentMethod ? charge.paymentMethod.replace('_', ' ') : 'Room Charge'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {charge.orderId && (
                          <button
                            onClick={() => setSelectedOrderId(charge.orderId!)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            View Associated Order
                          </button>
                        )}
                        {charge.createdBy && (
                          <button
                            onClick={() => setCreatorIdForModal(charge.createdBy)}
                            className="text-gray-600 hover:text-gray-700 text-sm font-medium inline-flex items-center gap-2"
                          >
                            <User className="h-4 w-4" />
                            Created By
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
          customer={customer}
          onClose={() => {
            setShowChargeModal(false);
            refreshCharges();
          }}
        />
      )}

      {creatorIdForModal && (
        <CreatorInfoModal 
          userId={creatorIdForModal} 
          onClose={() => setCreatorIdForModal(null)} 
        />
      )}
    </div>
  );
}