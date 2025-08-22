import { useState, useMemo } from 'react';
import { X, Users, CreditCard, RefreshCw, Filter, AlertCircle, Plus, Eye, FileText, User, Info, Trash2, Edit, DollarSign, History } from 'lucide-react';
import { format } from 'date-fns';
import type { BookingGroup, Charge } from '../../../types/types';
import { formatCurrency, generateMergedBookingId } from '../../../utils/helper';
import PaymentIntentDetailView from './PaymentIntentDetailView';
import ComprehensivePaymentIntentEditForm from './ComprehensivePaymentIntentEditForm';
import CustomPartialRefundModal from './CustomPartialRefundModal';
import ChargeModal from '../customers/ChargeModal';
import CreatorInfoModal from '../customers/CreatorInfoModal';
import ChargeRefundModal from '../shared/ChargeRefundModal';
import OrderDetailsModal from '../customers/OrderDetailsModal';
import DeleteConfirmationModal from '../../ui/DeleteConfirmationModal';
import RefundConfirmationModal from './RefundConfirmationModal';
import AuditLogModal from './AuditLogModal';
import { baseUrl } from '../../../utils/constants';
import toast from 'react-hot-toast';

interface BookingGroupModalProps {
  group: BookingGroup;
  onClose: () => void;
  onRefresh: () => void;
  onDelete?: (groupId: string, reason?: string) => void;
}

export default function BookingGroupModal({ group, onClose, onRefresh, onDelete }: BookingGroupModalProps) {
  const [activeTab, setActiveTab] = useState<'bookings' | 'orders' | 'payments' | 'audit'>('bookings');
  const [selectedPaymentIntent, setSelectedPaymentIntent] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Additional state for payments functionality
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [creatorIdForModal, setCreatorIdForModal] = useState<string | null>(null);  
  const [showChargeRefundModal, setShowChargeRefundModal] = useState(false);
  const [selectedChargeForRefund, setSelectedChargeForRefund] = useState<Charge | null>(null);
  const [showRefundDetailsModal, setShowRefundDetailsModal] = useState(false);
  const [selectedChargeForRefundDetails, setSelectedChargeForRefundDetails] = useState<Charge | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit payment intent state
  const [editingPaymentIntent, setEditingPaymentIntent] = useState<any>(null);
  
  // Refund state for payment intents
  const [refundingPaymentIntent, setRefundingPaymentIntent] = useState<any>(null);
  const [showPaymentIntentRefundModal, setShowPaymentIntentRefundModal] = useState(false);
  const [showPartialRefundModal, setShowPartialRefundModal] = useState(false);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  
  // Audit log states
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [selectedPaymentIntentForAudit, setSelectedPaymentIntentForAudit] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  // Generate confirmation number function similar to the one in Bookings.tsx
  const generateConfirmationNumber = (paymentIntent: any) => {
    if (!paymentIntent.bookings || paymentIntent.bookings.length === 0) {
      return "PROCESSING";
    }
    return generateMergedBookingId(paymentIntent.bookings.map((b: any) => b.id));
  };

  // Calculate totals with safety checks
  const totalBookings = group.paymentIntents?.reduce((sum, pi) => sum + (pi.bookings?.length || 0), 0) || 0;
  const totalAmount = group.paymentIntents?.reduce((sum, pi) => sum + pi.totalAmount, 0) || 0;
  const totalCharges = group.charges?.reduce((sum, charge) => sum + charge.amount, 0) || 0;
  const totalOrders = group.orders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const outstandingAmount = group.outstandingAmount || 0;
  const paidAmount = totalAmount - outstandingAmount;

  // Get all charges and apply filters
  const allCharges = group.charges || [];
  const charges = useMemo(() => {
    return allCharges.filter((charge: any) => {
      const matchesStatus = statusFilter === 'ALL' || charge.status === statusFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'ALL' || 
        (charge.paymentMethod ? 
          charge.paymentMethod.replace('_', ' ').toUpperCase() === paymentMethodFilter ||
          charge.paymentMethod.toUpperCase() === paymentMethodFilter
        : paymentMethodFilter === 'ROOM CHARGE');
      return matchesStatus && matchesPaymentMethod;
    });
  }, [allCharges, statusFilter, paymentMethodFilter]);

  // Check if booking payments should be shown based on filters
  const showBookingPayments = useMemo(() => {
    return group.paymentIntents?.filter((pi: any) => {
      if (pi.status !== 'SUCCEEDED') return false;
      const bookingStatus = 'SUCCEEDED';
      const bookingMethod = pi.paymentMethod || 'STRIPE';
      
      const matchesStatus = statusFilter === 'ALL' || bookingStatus === statusFilter;
      const matchesPaymentMethod = paymentMethodFilter === 'ALL' || 
        bookingMethod.toUpperCase() === paymentMethodFilter;
        
      return matchesStatus && matchesPaymentMethod;
    }) || [];
  }, [group.paymentIntents, statusFilter, paymentMethodFilter]);

  // Handlers for payments functionality
  const handleAddPayment = () => {
    setShowChargeModal(true);
  };

  const handleChargeRefund = (charge: Charge) => {
    setSelectedChargeForRefund(charge);
    setShowChargeRefundModal(true);
  };

  const handleViewRefundDetails = (charge: Charge) => {
    setSelectedChargeForRefundDetails(charge);
    setShowRefundDetailsModal(true);
  };

  const onRefundSuccess = async () => {
    await handleRefresh();
  };

  // Filter payment intents with safety check
  const filteredPaymentIntents = (group.paymentIntents || []).filter(pi => {
    const matchesStatus = statusFilter === 'ALL' || pi.status === statusFilter;
    const matchesSearch = !searchTerm || 
      pi.customer?.guestFirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.customer?.guestLastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.customer?.guestEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  
  const handleViewPaymentIntent = (paymentIntent: any) => {
    setSelectedPaymentIntent(paymentIntent);
  };

  const handleEditPaymentIntent = (paymentIntent: any) => {
    setEditingPaymentIntent(paymentIntent);
  };

  const handleRefundPaymentIntent = (paymentIntent: any) => {
    setRefundingPaymentIntent(paymentIntent);
    setShowPaymentIntentRefundModal(true);
  };

  const handlePartialRefund = (paymentIntent: any) => {
    setRefundingPaymentIntent(paymentIntent);
    setShowPartialRefundModal(true);
  };

  const processRefund = async (data: { reason: string; sendEmailToCustomer: boolean; processRefund: boolean }) => {
    if (!refundingPaymentIntent) return;
    
    setIsProcessingRefund(true);
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: refundingPaymentIntent.id,
          bookingData: refundingPaymentIntent.bookingData,
          customerDetails: refundingPaymentIntent.customerData || refundingPaymentIntent.customer,
          paymentMethod: refundingPaymentIntent.paymentMethod || 'STRIPE',
          reason: data.reason,
          sendEmailToCustomer: data.sendEmailToCustomer,
          processRefund: data.processRefund
        }),
      });

      if (response.ok) {
        toast.success('Payment intent refunded successfully');
        setShowPaymentIntentRefundModal(false);
        setRefundingPaymentIntent(null);
        handleRefresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to refund payment intent');
      }
    } catch (error) {
      console.error('Error refunding payment intent:', error);
      toast.error('Failed to refund payment intent');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleViewAuditLogs = async (paymentIntent: any) => {
    setSelectedPaymentIntentForAudit(paymentIntent);
    setShowAuditLogs(true);
    await fetchPaymentIntentAuditLogs(paymentIntent.id);
  };

  const fetchPaymentIntentAuditLogs = async (paymentIntentId: string) => {
    setAuditLogsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/${paymentIntentId}/audit-logs`, {
        credentials: 'include',
      });
      const data = await response.json();
      setAuditLogs(data.data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]);
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const handleDeleteGroup = async (reason?: string) => {
    if (!onDelete) return;
    
    if (!reason?.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }
    
    setIsDeleting(true);
    try {
      // Call the parent's delete handler
      onDelete(group.id, reason.trim());
      setShowDeleteModal(false);
      onClose(); // Close the modal after successful deletion
    } catch (error) {
      console.error('Error deleting group:', error);
      // You might want to show an error message here
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
          {/* Loading Overlay */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10" style={{top: '80px'}}>
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Refreshing data...</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                {group.groupName || `Group ${group.id.slice(0, 8)}`}
                {group.isAutoGrouped && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Auto-grouped
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {group._count.paymentIntents} payment intents • {totalBookings} bookings • Created {format(new Date(group.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2 relative z-20">
              {onDelete && !group.isAutoGrouped && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isRefreshing || isDeleting}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Delete booking group"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
              <button 
                onClick={onClose} 
                disabled={isRefreshing}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Outstanding Balance Alert */}
          {outstandingAmount > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-900">Group Outstanding Balance</p>
                    <p className="text-xs text-amber-700">Total amount due across all bookings</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-amber-900">{formatCurrency(outstandingAmount)}</span>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</div>
                <div className="text-xs text-gray-500">Total Bookings</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{formatCurrency(totalCharges)}</div>
                <div className="text-xs text-gray-500">Total Charges</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{formatCurrency(totalOrders)}</div>
                <div className="text-xs text-gray-500">Total Orders</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${outstandingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(outstandingAmount)}
                </div>
                <div className="text-xs text-gray-500">Outstanding</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'bookings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bookings ({group._count.paymentIntents})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Payments & Charges
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Room Orders ({group._count.orders})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'bookings' && (
              <div className="space-y-2">
                {/* Filters */}
                <div className="bg-gray-50 rounded-md p-2.5 mb-3 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-xs font-medium text-gray-700">Filters:</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by customer name, email, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-64"
                    />
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
                    </select>
                    {(statusFilter !== 'ALL' || searchTerm) && (
                      <button
                        onClick={() => {
                          setStatusFilter('ALL');
                          setSearchTerm('');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Clear
                      </button>
                    )}
                    <div className="ml-auto text-xs text-gray-500">
                      {filteredPaymentIntents.length} of {(group.paymentIntents || []).length} shown
                    </div>
                  </div>
                </div>

                {/* Payment Intents List */}
                {filteredPaymentIntents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-xs font-medium text-gray-900">No payment intents found</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {searchTerm || statusFilter !== 'ALL' 
                        ? 'Try adjusting your filters' 
                        : 'This group has no payment intents yet'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPaymentIntents.map((pi) => (
                      <div key={pi.id} className="bg-white rounded-md p-3 border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {pi.customer 
                                  ? `${pi.customer.guestFirstName} ${pi.customer.guestLastName}` 
                                  : 'Unknown Customer'
                                }
                              </h4>
                              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                pi.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' :
                                pi.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                pi.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {pi.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              Payment Intent #{pi.id.slice(-8)} • {pi.customer?.guestEmail}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(pi.totalAmount)}</p>
                            {pi.outstandingAmount !== undefined && pi.outstandingAmount > 0 && (
                              <p className="text-xs text-amber-600">
                                Outstanding: {formatCurrency(pi.outstandingAmount)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bookings */}
                        {pi.bookings.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Bookings:</p>
                            <div className="space-y-1">
                              {pi.bookings.map((booking) => (
                                <div key={booking.id} className="flex items-center justify-between text-xs text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{booking.room.name}</span>
                                    <span>•</span>
                                    <span>{booking.totalGuests} guests</span>
                                  </div>
                                  <span>
                                    {format(new Date(booking.checkIn), 'MMM dd')} - {format(new Date(booking.checkOut), 'MMM dd')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewPaymentIntent(pi)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleViewAuditLogs(pi)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                          >
                            <History className="h-3 w-3 mr-1" />
                            History
                          </button>
                          <button
                            onClick={() => handleEditPaymentIntent(pi)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </button>
                          {pi.status === 'SUCCEEDED' && (
                            <>
                              <button
                                onClick={() => handlePartialRefund(pi)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Partial Refund
                              </button>
                              <button
                                onClick={() => handleRefundPaymentIntent(pi)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 transition-colors"
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Full Refund
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-2">
                {/* Payment Summary Header - Compact */}
                <div className="bg-gray-50 rounded-md p-2.5 mb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Total Bookings</p>
                        <p className="text-xs font-semibold">{formatCurrency(totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-xs font-semibold text-green-600">
                          {formatCurrency(paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Outstanding</p>
                        <p className={`text-xs font-semibold ${outstandingAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {formatCurrency(outstandingAmount)}
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
                
                {charges.length === 0 && allCharges.length === 0 && showBookingPayments.length === 0 ? (
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
                    {/* Show booking payments if succeeded and matches filters - Compact */}
                    {showBookingPayments.map((pi: any) => (
                      <div key={`booking-${pi.id}`} className="rounded-md p-2.5 border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-900">Booking Payment</p>
                              <p className="text-xs text-gray-600">
                                {pi.paidAt ? format(new Date(pi.paidAt), 'MMM dd, HH:mm') : 'Payment date unknown'}
                              </p>
                            </div>
                            <div className="border-l pl-3">
                              <p className="text-xs text-gray-500">Amount</p>
                              <p className="text-xs font-medium">{formatCurrency(pi.totalAmount)}</p>
                            </div>
                            <div className="border-l pl-3">
                              <p className="text-xs text-gray-500">Method</p>
                              <p className="text-xs font-medium">{pi.paymentMethod || 'STRIPE'}</p>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            SUCCEEDED
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Show charges - Compact */}
                    {charges?.map((charge: any) => (
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
                {(group.orders || []).length === 0 ? (
                  <div className="text-center py-6">
                    <div className="h-12 w-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-gray-900">No room orders found</p>
                    <p className="text-xs text-gray-600 mt-0.5">No items have been added to this group's tab yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Orders Summary */}
                    <div className="bg-green-50 rounded-md p-2.5 mb-3 border border-green-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-medium text-green-900">Room Orders Summary</h4>
                          <p className="text-xs text-green-700 mt-0.5">{group.orders.length} orders • Added to group tab</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-900">
                            {formatCurrency(totalOrders)}
                          </p>
                          <p className="text-xs text-green-600">Total value</p>
                        </div>
                      </div>
                    </div>

                    {/* Individual Orders - Compact */}
                    <div className="space-y-2">
                      {group.orders.map((order: any) => (
                        <div key={order.id} className="bg-white rounded-md p-2.5 border border-gray-200 hover:border-green-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs font-semibold text-gray-900">
                                    Order #{order.id.slice(-6)}
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
                                  {order.createdAt && format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                                  {order.items && order.items.length > 0 && (
                                    <span className="ml-2">• {order.items.length} items</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                              </div>
                              <button
                                onClick={() => setSelectedOrderId(order.id)}
                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Intent Detail Modal */}
      {selectedPaymentIntent && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
                <p className="text-sm text-gray-600">
                  Confirmation: {generateConfirmationNumber ? generateConfirmationNumber(selectedPaymentIntent) : 'PROCESSING'}
                </p>
              </div>
              <button
                onClick={() => setSelectedPaymentIntent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <PaymentIntentDetailView
                paymentIntent={selectedPaymentIntent}
                paymentDetails={null}
                loadingPayment={false}
                onSendEmail={() => {}}
                onCancel={() => {}}
                onRefund={() => {}}
                onViewPayment={() => {}}
                onDelete={() => {}}
                onRefresh={handleRefresh}
                loadingAction={false}
                generateConfirmationNumber={generateConfirmationNumber}
                hideViewPayments={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
  
      {showChargeModal && group.paymentIntents?.[0]?.customer && (
        <ChargeModal
          step='create_payment'
          customer={group.paymentIntents[0].customer}
          paymentIntentId={group.paymentIntents[0]?.id}
          onClose={async () => {
            setShowChargeModal(false);
            await handleRefresh();
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
        isOpen={showChargeRefundModal}
        onClose={() => {
          setShowChargeRefundModal(false);
          setSelectedChargeForRefund(null);
        }}
        charge={selectedChargeForRefund}
        onRefundSuccess={onRefundSuccess}
      />

      {/* Refund Details Modal */}
      {showRefundDetailsModal && selectedChargeForRefundDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
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

      {/* Edit Payment Intent Modal */}
      {editingPaymentIntent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <ComprehensivePaymentIntentEditForm
              paymentIntent={editingPaymentIntent}
              onClose={() => setEditingPaymentIntent(null)}
              onUpdate={() => {
                setEditingPaymentIntent(null);
                handleRefresh();
              }}
            />
          </div>
        </div>
      )}

      {/* Payment Intent Refund Modal */}
      {showPaymentIntentRefundModal && refundingPaymentIntent && (
        <RefundConfirmationModal
          isOpen={showPaymentIntentRefundModal}
          onClose={() => {
            setShowPaymentIntentRefundModal(false);
            setRefundingPaymentIntent(null);
          }}
          onConfirm={processRefund}
          paymentIntent={refundingPaymentIntent}
          loading={isProcessingRefund}
        />
      )}

      {/* Partial Refund Modal */}
      {showPartialRefundModal && refundingPaymentIntent && (
        <CustomPartialRefundModal
          isOpen={showPartialRefundModal}
          paymentIntent={refundingPaymentIntent}
          onClose={() => {
            setShowPartialRefundModal(false);
            setRefundingPaymentIntent(null);
          }}
          onRefundSuccess={() => {
            setShowPartialRefundModal(false);
            setRefundingPaymentIntent(null);
            handleRefresh();
          }}
        />
      )}

      {/* Audit Log Modal */}
      {showAuditLogs && selectedPaymentIntentForAudit && (
        <AuditLogModal
          isOpen={showAuditLogs}
          onClose={() => {
            setShowAuditLogs(false);
            setSelectedPaymentIntentForAudit(null);
            setAuditLogs([]);
          }}
          paymentIntent={selectedPaymentIntentForAudit}
          auditLogs={auditLogs}
          auditLogsLoading={auditLogsLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteGroup}
        title="Delete Booking Group"
        itemName={group.groupName || `Group ${group.id.slice(0, 8)}`}
        message={`Are you sure you want to delete this booking group? This will not delete the individual bookings, but will remove the group association. This action cannot be undone.`}
        confirmButtonText="Delete Group"
        isLoading={isDeleting}
        requireReason={true}
        reasonLabel="Reason for deletion"
        reasonPlaceholder="Please explain why you are deleting this booking group (e.g., duplicate entry, test data, customer request, etc.)"
      />
    </>
  );
}