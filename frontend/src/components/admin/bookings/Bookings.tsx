import { useEffect, useState } from "react"
import {
  Search,
  RefreshCw,
  X,
  Filter,
  Plus,
 } from "lucide-react"
import { baseUrl } from "../../../utils/constants"
import { CreateBookingModal } from "./CreateBookingModal"
import BookingGroups from "./BookingGroups"
import type { BookingGroup, PaymentDetails, PaymentIntent } from "../../../types/types"
import PaymentIntentsList from "./PaymenItentList"
import PaymentIntentDetailsView from "./PaymentIntentDetailView"
import ComprehensivePaymentIntentEditForm from "./ComprehensivePaymentIntentEditForm"
import RefundConfirmationModal from "./RefundConfirmationModal"
import FutureRefundModal from "./FutureRefundModal"
import toast from 'react-hot-toast';
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import RestoreConfirmationModal from "./RestoreConfirmationModal";
import { usePaymentIntents } from "../../../hooks/usePaymentIntents";
import BookingGroupCard from "./BookingGroupCard"
import BookingGroupModal from "./BookingGroupModal"
import { useBookingGroups } from "../../../hooks/useBookingGroups"
import { generateMergedBookingId } from "../../../utils/helper"

export default function BookingManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [groupSearchTerm, setGroupSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL")
  const [selectedPaymentIntent, setSelectedPaymentIntent] = useState<PaymentIntent | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePaymentIntent, setDeletePaymentIntent] = useState<PaymentIntent | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPaymentIntent, setEditingPaymentIntent] = useState<PaymentIntent | null>(null)
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([])
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [tempHolds, setTempHolds] = useState<any[] | null>(null);
  const [loadingTempHoldDelete, setLoadingTempHoldDelete] = useState<string | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundPaymentIntent, setRefundPaymentIntent] = useState<PaymentIntent | null>(null);
  const [showFutureRefundModal, setShowFutureRefundModal] = useState(false);
  const [futureRefundPaymentIntent, setFutureRefundPaymentIntent] = useState<PaymentIntent | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restorePaymentIntent, setRestorePaymentIntent] = useState<PaymentIntent | null>(null);
  const [filterType, setFilterType] = useState('ALL'); // ALL, AUTO, MANUAL
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, OUTSTANDING, PAID
  const [selectedGroup, setSelectedGroup] = useState<BookingGroup | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [urlPaymentIntentId, setUrlPaymentIntentId] = useState<string | null>(null);
  const {
    bookingGroups,
    refetch,
  } = useBookingGroups();
  // Use the custom hooks for active and deleted payment intents
  const {
    paymentIntents: activePaymentIntents,
    loading: activeLoading,
    softDelete,
    hardDelete,
    refetch: refetchActive
  } = usePaymentIntents('active');

  const {
    paymentIntents: deletedPaymentIntents,
    loading: deletedLoading,
    restore,
    hardDelete: hardDeleteDeleted,
    refetch: refetchDeleted
  } = usePaymentIntents('deleted', false);

  // Determine current data based on active tab
  const currentPaymentIntents = activeTab === "deleted" ? deletedPaymentIntents : activePaymentIntents;
  const currentLoading = activeTab === "deleted" ? deletedLoading : activeLoading;

  // Check for URL parameters on mount and when data loads
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get('paymentIntentId');
    
    if (paymentIntentId && !urlPaymentIntentId) {
      setUrlPaymentIntentId(paymentIntentId);
    }
  }, []);

  // Handle opening the appropriate modal when payment intent is found
  useEffect(() => {
    if (!urlPaymentIntentId || activeLoading || deletedLoading) return;
    
    // First try to find in active payment intents
    let foundPaymentIntent = activePaymentIntents.find(pi => pi.id === urlPaymentIntentId);
    let isInDeleted = false;
    
    // If not found in active, check deleted
    if (!foundPaymentIntent) {
      foundPaymentIntent = deletedPaymentIntents.find(pi => pi.id === urlPaymentIntentId);
      isInDeleted = true;
    }
    
    if (foundPaymentIntent) {
      // Switch to the appropriate tab
      if (isInDeleted) {
        setActiveTab("deleted");
      }
      
      // Check if it belongs to a booking group
      if (foundPaymentIntent.bookingGroupId) {
        // Find the booking group
        const group = bookingGroups.find(g => g.id === foundPaymentIntent.bookingGroupId);
        if (group) {
          // Switch to groups tab and open the modal
          setActiveTab("groups");
          setTimeout(() => {
            setSelectedGroup(group);
            setShowGroupModal(true);
          }, 100);
        } else {
          // Group not found, just show the payment intent
          setSelectedPaymentIntent(foundPaymentIntent);
        }
      } else {
        // No group, just show the payment intent details
        setSelectedPaymentIntent(foundPaymentIntent);
      }
      
      // Clear the URL parameter after handling
      setUrlPaymentIntentId(null);
      // Clean up URL without reload
      const newUrl = window.location.pathname + '?sidebar=bookings';
      window.history.replaceState({}, '', newUrl);
    }
  }, [urlPaymentIntentId, activePaymentIntents, deletedPaymentIntents, bookingGroups, activeLoading, deletedLoading]);

  const onSendInvoice = async (id: string) => {
    setLoadingAction(true);
    try {
      const res = await fetch(baseUrl + "/admin/customers/send-invoice", {
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ paymentIntentId: id }),
        headers: {
          "Content-type": "application/json"
        }
      });

      if (res.ok) {
        toast.success("Invoice sent successfully");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send invoice");
      }
    } catch (e: any) {
      console.error("Error sending invoice:", e);
      toast.error(e.message || "Failed to send invoice");
    } finally {
      setLoadingAction(false);
    }
  } 

  // Filter payment intents based on search term and filters
  const filteredPaymentIntents = currentPaymentIntents.filter(pi => {
    // Filter by tab (admin created vs all)
    if (activeTab === "admin") {
      if (!pi.createdByAdmin) return false;
    }

    // Status filter
    if (statusFilter !== "ALL") {
      if (pi.status !== statusFilter) return false;
    }

    // Payment method filter
    if (paymentMethodFilter !== "ALL") {
      if (pi.paymentMethod !== paymentMethodFilter) return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      
      // Search by customer name
      const nameMatch = pi.customerData?.firstName?.toLowerCase().includes(term) ||
        pi.customerData?.lastName?.toLowerCase().includes(term);
      
      // Search by email
      const emailMatch = pi.customerData?.email?.toLowerCase().includes(term);
      
      // Search by payment intent ID
      const idMatch = pi.id.toLowerCase().includes(term);
      
      // Search by room name
      const roomMatch = pi.bookingData?.some?.((booking) => 
        booking.roomDetails?.name?.toLowerCase().includes(term)
      );
      
      // Search by confirmation ID (merged booking ID)
      const confirmationId = pi.bookings?.length > 0 
        ? generateMergedBookingId(pi.bookings.map(b => b.id)).toLowerCase()
        : '';
      const confirmationMatch = confirmationId.includes(term);
      
      // Search by group name (if part of a booking group)
      //@ts-ignore
      const groupMatch = pi.bookingGroup?.groupName?.toLowerCase().includes(term) || false;
      
      if (!(nameMatch || emailMatch || idMatch || roomMatch || confirmationMatch || groupMatch)) {
        return false;
      }
    }

    return true;
  });

  const filteredGroups = bookingGroups.filter(group => {
    // Use the appropriate search term based on active tab
    // In "All Bookings" tab, use the same search term as individual payment intents
    // In "Groups" tab, use the separate group search term
    const searchTermToUse = activeTab === "groups" ? groupSearchTerm : searchTerm;
    
    const matchesSearch = !searchTermToUse || 
      (group.groupName?.toLowerCase().includes(searchTermToUse.toLowerCase())) ||
      group.paymentIntents.some(pi => 
        pi.customer?.guestFirstName?.toLowerCase().includes(searchTermToUse.toLowerCase()) ||
        pi.customer?.guestLastName?.toLowerCase().includes(searchTermToUse.toLowerCase()) ||
        pi.customer?.guestEmail?.toLowerCase().includes(searchTermToUse.toLowerCase())
      );

    const matchesType = filterType === 'ALL' || 
      (filterType === 'AUTO' && group.isAutoGrouped) ||
      (filterType === 'MANUAL' && !group.isAutoGrouped);

    const matchesStatus = filterStatus === 'ALL' ||
      (filterStatus === 'OUTSTANDING' && (group.outstandingAmount || 0) > 0) ||
      (filterStatus === 'PAID' && (group.outstandingAmount || 0) <= 0);

    return matchesSearch && matchesType && matchesStatus;
  });

  const fetchAllTempHolds = async () => {
    try {
      const res = await fetch(baseUrl + "/admin/rooms/temp-holds/all", {
        credentials: "include"
      });
      const data = await res.json();
      const parsedTempHolds = data.data.map((item: any) => {
        let parsedCustomerData = {};
      
        try {
          parsedCustomerData = JSON.parse(item.paymentIntent.customerData);
        } catch (err) {
          console.error('Failed to parse customerData:', err);
        }
      
        return {
          ...item,
          customerData: parsedCustomerData, // attached parsed data as a new key
        };
      });
      
      setTempHolds(parsedTempHolds);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    if (activeTab === "temp-holds") {
      fetchAllTempHolds();
    } else if (activeTab === "deleted" && deletedPaymentIntents.length === 0) {
      refetchDeleted();
    }
  }, [activeTab])

  const fetchPaymentIntents = () => {
    if (activeTab === "deleted") {
      refetchDeleted();
    } else {
      refetchActive();
    }
  };

  const fetchPaymentDetails = async (paymentIntentId: string) => {
    setLoadingPayment(true)
    try {
      const response = await fetch(`${baseUrl}/admin/payments/${paymentIntentId}/details`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      setPaymentDetails(data.paymentDetails)
    } catch (error) {
      console.error("Failed to fetch payment details:", error)
      toast.error("Failed to load payment details")
    } finally {
      setLoadingPayment(false)
    }
  }

  const handleDeleteClick = (paymentIntent: PaymentIntent) => {
    setDeletePaymentIntent(paymentIntent);
    setShowDeleteModal(true);
  };

  const handleSoftDelete = async () => {
    if (!deletePaymentIntent) return;
    
    setLoadingAction(true);
    const success = await softDelete(deletePaymentIntent.id);
    if (success) {
      setSelectedPaymentIntent(null);
    }
    setLoadingAction(false);
    setShowDeleteModal(false);
    setDeletePaymentIntent(null);
  };

  const handleHardDelete = async () => {
    if (!deletePaymentIntent) return;
    
    setLoadingAction(true);
    const deleteFunction = activeTab === "deleted" ? hardDeleteDeleted : hardDelete;
    const success = await deleteFunction(deletePaymentIntent.id);
    if (success) {
      setSelectedPaymentIntent(null);
    }
    setLoadingAction(false);
    setShowDeleteModal(false);
    setDeletePaymentIntent(null);
  };

  const handleRestore = (paymentIntent: PaymentIntent) => {
    setRestorePaymentIntent(paymentIntent);
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!restorePaymentIntent) return;
    
    setLoadingAction(true);
    try {
      await restore(restorePaymentIntent.id);
      toast.success('Booking restored successfully');
      setShowRestoreModal(false);
      setRestorePaymentIntent(null);
      if (selectedPaymentIntent?.id === restorePaymentIntent.id) {
        setSelectedPaymentIntent(null);
      }
    } catch (error) {
      toast.error('Failed to restore booking');
    } finally {
      setLoadingAction(false);
    }
  };

  const sendConfirmationEmail = async (paymentIntentId: string) => {
    setLoadingAction(true)
    try {
      const paymentIntent = activePaymentIntents.find((pi) => pi.id === paymentIntentId)
      if (!paymentIntent) throw new Error("Payment intent not found")

      const response = await fetch(`${baseUrl}/admin/bookings/${paymentIntentId}/send-confirmation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentMethod: paymentIntent.paymentMethod || 'STRIPE'
        })
      })

      if (response.ok) {
        toast.success("Confirmation email sent successfully")
      } else {
        throw new Error("Failed to send email")
      }
    } catch (error) {
      toast.error("Failed to send confirmation email")
    } finally {
      setLoadingAction(false)
    }
  }

  const confirmBooking = async (paymentIntentId: string) => {
    setLoadingAction(true)
    try {
      const paymentIntent = activePaymentIntents.find((pi) => pi.id === paymentIntentId)
      let customerRequest = paymentIntent?.customerData?.specialRequests || '';
      if (
        paymentIntent &&
        (paymentIntent.paymentMethod === 'CASH' || paymentIntent.paymentMethod === 'BANK_TRANSFER')
      ) {
        customerRequest = window.prompt('Enter any customer request/notes for this booking (optional):', customerRequest) || customerRequest;
      }
      const response = await fetch(`${baseUrl}/admin/bookings/confirm-booking`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId, customerRequest })
      })
      if (response.ok) {
        toast.success("Booking confirmed successfully")
        fetchPaymentIntents()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to confirm booking")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm booking")
    } finally {
      setLoadingAction(false)
    }
  }

  const cancelAndRefundPaymentIntent = async (paymentIntent: PaymentIntent) => {
    // Show the refund confirmation modal instead of immediate processing
    setRefundPaymentIntent(paymentIntent);
    setShowRefundModal(true);
  }

  const handleFutureRefund = async (paymentIntent: PaymentIntent) => {
    // Show the future refund confirmation modal
    setFutureRefundPaymentIntent(paymentIntent);
    setShowFutureRefundModal(true);
  }

  const processRefund = async (data: { stripeReason: string; reason: string; sendEmailToCustomer: boolean; processRefund: boolean }) => {
    if (!refundPaymentIntent) return;
    
    setLoadingAction(true);
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: refundPaymentIntent.id,
          bookingData: refundPaymentIntent.bookingData,
          customerDetails: refundPaymentIntent.customerData,
          paymentMethod: refundPaymentIntent.paymentMethod || 'STRIPE',
          reason: data.reason,
          sendEmailToCustomer: data.sendEmailToCustomer,
          stripeReason: data.stripeReason,
          processRefund: data.processRefund
        }),
      });

      if (response.status === 200) {
        const successMessage = data.processRefund 
          ? "Payment intent cancelled and refunded successfully"
          : "Payment intent cancelled successfully";
        toast.success(successMessage);
        fetchPaymentIntents();
        setShowRefundModal(false);
        setRefundPaymentIntent(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process request");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process request");
    } finally {
      setLoadingAction(false);
    }
  }

  const processFutureRefund = async (data: { sendEmailToCustomer: boolean }) => {
    if (!futureRefundPaymentIntent) return;
    
    setLoadingAction(true);
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/future-refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: futureRefundPaymentIntent.id,
          sendEmailToCustomer: data.sendEmailToCustomer
        }),
      });

      if (response.status === 200) {
        toast.success("Future refund processed successfully");
        fetchPaymentIntents();
        setShowFutureRefundModal(false);
        setFutureRefundPaymentIntent(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process future refund");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to process future refund");
    } finally {
      setLoadingAction(false);
    }
  }

  const startEditing = (paymentIntent: PaymentIntent) => {
    setEditingPaymentIntent(paymentIntent)
  }

  const cancelEditing = () => {
    setEditingPaymentIntent(null)
  }

  const handleBookingSelect = (bookingId: string, checked: boolean) => {
    setSelectedBookingIds(ids =>
      checked ? [...ids, bookingId] : ids.filter(id => id !== bookingId)
    );
  };

  const deleteTempHold = async (id: string) => {
    if (!confirm("Are you sure you want to delete this temp hold? This action cannot be undone.")) {
      return;
    }
    setLoadingTempHoldDelete(id);
    try {
      const res = await fetch(`${baseUrl}/admin/rooms/temp-holds/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        toast.success("Temp hold deleted successfully");
        fetchAllTempHolds();
      } else {
        throw new Error("Failed to delete temp hold");
      }
    } catch (error) {
      toast.error("Failed to delete temp hold");
    } finally {
      setLoadingTempHoldDelete(null);
    }
  };

  const handleViewBookings = (group: BookingGroup) => {
    setSelectedPaymentIntent(null); // Clear any selected payment intent
    setSelectedGroup(group);
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: BookingGroup) => {
    setSelectedGroup(group);
    setShowEditModal(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600 mt-1">Manage reservations, payments, and guest communications</p>
        </div>
        <div className="gap-2 flex">
          <button
            onClick={fetchPaymentIntents}
            disabled={currentLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${currentLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className={`h-4 w-4 mr-2`} />
            Create Booking
          </button>
        </div>
      </div>

      {isCreateModalOpen && <CreateBookingModal setIsCreateModalOpen={setIsCreateModalOpen} fetchBookings={fetchPaymentIntents} />}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab("all");
              setSelectedPaymentIntent(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Bookings
          </button>
          <button
            onClick={() => {
              setActiveTab("admin");
              setSelectedPaymentIntent(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "admin"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Admin Created
          </button>
          <button
            onClick={() => {
              setActiveTab("groups");
              setSelectedPaymentIntent(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "groups"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Groups
          </button>
        
          <button
            onClick={() => {
              setActiveTab("temp-holds");
              setSelectedPaymentIntent(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "temp-holds"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Temp Holds Rooms 
          </button>
          <button
            onClick={() => {
              setActiveTab("deleted");
              setSelectedPaymentIntent(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "deleted"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Deleted ({deletedPaymentIntents.length})
          </button>
        </nav>
      </div>

      {/* Render Occupancy tab or normal UI */}
      {activeTab === "temp-holds" ? (
        <div>
          {
            tempHolds && tempHolds?.length === 0 ? (<span>No temp holds found</span>) : (
              <div className="flex flex-col gap-4">
                {
                  tempHolds?.map((temp: any) => {
                    const room = temp.room || {};
                    const roomImage = room.images && room.images.length > 0 ? room.images[0].url : null;
                    return (
                      <div key={temp.id} className="bg-white rounded-2xl shadow flex items-center border border-gray-200 overflow-hidden">
                        {/* Room Image */}
                        <div className="flex-shrink-0 w-20 h-20 bg-gray-100 flex items-center justify-center">
                          {roomImage ? (
                            <img src={roomImage} alt={room.name || 'Room'} className="w-14 h-14 object-cover rounded-xl" />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-2xl">🏨</div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 px-4 py-3 flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">{temp.customerData.firstName} {temp.customerData.lastName}</span>
                            <span className="ml-2 text-xs text-gray-500 truncate">{temp.customerData.email}</span>
                          </div>
                          <div className="text-sm text-blue-700 font-medium truncate">{room.name || 'Room'}</div>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>Check-in: {new Date(temp.checkIn).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Check-out: {new Date(temp.checkOut).toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs text-gray-400">Expires: {new Date(temp.expiresAt).toLocaleString()}</div>
                        </div>
                        {/* Delete Button */}
                        <button
                          className="m-4 p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                          title="Delete Temp Hold"
                          onClick={() => deleteTempHold(temp.id)}
                          disabled={loadingTempHoldDelete === temp.id}
                        >
                          {loadingTempHoldDelete === temp.id ? (
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                          ) : (
                            <X className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    );
                  })
                }
              </div>
            ) 
          }
        </div>
      ) : activeTab === "groups" ? (
        <BookingGroups  selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup} setShowEditModal={setShowEditModal} showEditModal={showEditModal} showGroupModal={showGroupModal}  setShowGroupModal={setShowGroupModal} handleEditGroup={handleEditGroup} handleViewBookings={handleViewBookings}  filteredGroups={filteredGroups} filterType={filterType} setFilterStatus={setFilterStatus} setFilterType={setFilterType} filterStatus={filterStatus} searchTerm={groupSearchTerm} setSearchTerm={setGroupSearchTerm} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, confirmation ID, group name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCEEDED">Succeeded</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="STRIPE">Stripe</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

       

          {/* Bookings List */}
          <PaymentIntentsList
            groups={bookingGroups}
            paymentIntents={filteredPaymentIntents}
            loading={currentLoading}
            onViewDetails={(pi) => {
              // If payment intent belongs to a group, open group modal instead
              if (pi.bookingGroupId) {
                const group = bookingGroups.find(g => g.id === pi.bookingGroupId);
                if (group) {
                  // Ensure no other modals are open first
                  setSelectedPaymentIntent(null);
                  setShowGroupModal(false);
                  
                  // Use setTimeout to ensure state updates are processed
                  setTimeout(() => {
                    setSelectedGroup(group);
                    setShowGroupModal(true);
                  }, 10);
                  return;
                }
              }
              
              // Otherwise open individual payment intent details
              // Make sure group modal is closed first
              setShowGroupModal(false);
              setSelectedGroup(null);
              setSelectedPaymentIntent(pi);
            }}
            onSendEmail={sendConfirmationEmail}
            onCancel={cancelAndRefundPaymentIntent}
            onRefund={cancelAndRefundPaymentIntent}
            onFutureRefund={handleFutureRefund}
            onViewPayment={fetchPaymentDetails}
            onEdit={startEditing}
            onDelete={handleDeleteClick}
            onRestore={activeTab === "deleted" ? handleRestore : undefined}
            loadingAction={loadingAction}
            selectedBookingIds={selectedBookingIds}
            onBookingSelect={handleBookingSelect}
            onConfirmBooking={confirmBooking}
            isDeletedTab={activeTab === "deleted"}
          />

          {filteredGroups.map((group) => (
            <BookingGroupCard 
              key={group.id}
              group={group} 
              onRefresh={refetch} 
              onEdit={handleEditGroup} 
              onViewBookings={handleViewBookings} 
              isMergedView={true}
              onViewPaymentIntent={() => {
                // For payment intents within groups, always open the group modal
                setSelectedPaymentIntent(null);
                setShowGroupModal(false);
                
                setTimeout(() => {
                  setSelectedGroup(group);
                  setShowGroupModal(true);
                }, 10);
              }}
            />
          ))}

          {selectedPaymentIntent && !showGroupModal && activeTab !== "groups" && activeTab !== "occupancy" && activeTab !== "temp-holds" && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
                  </div>
                  <button
                    onClick={() => setSelectedPaymentIntent(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <PaymentIntentDetailsView
                    onSendInvoice={onSendInvoice}
                    onDelete={() => handleDeleteClick(selectedPaymentIntent)}
                    onRestore={activeTab === "deleted" ? () => handleRestore(selectedPaymentIntent) : undefined}
                    paymentIntent={selectedPaymentIntent}
                    paymentDetails={paymentDetails}
                    loadingPayment={loadingPayment}
                    onSendEmail={() => sendConfirmationEmail(selectedPaymentIntent.id)}
                    onCancel={() => cancelAndRefundPaymentIntent(selectedPaymentIntent)}
                    onRefund={() => cancelAndRefundPaymentIntent(selectedPaymentIntent)}
                    onViewPayment={() =>
                      selectedPaymentIntent.stripePaymentIntentId &&
                      fetchPaymentDetails(selectedPaymentIntent.stripePaymentIntentId)
                    }
                    onRefresh={fetchPaymentIntents}
                    loadingAction={loadingAction}
                    isDeletedTab={activeTab === "deleted"}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Refund Confirmation Modal */}
      <RefundConfirmationModal
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setRefundPaymentIntent(null);
        }}
        onConfirm={processRefund}
        paymentIntent={refundPaymentIntent}
        isLoading={loadingAction}
      />

      {/* Future Refund Modal */}
      <FutureRefundModal
        isOpen={showFutureRefundModal}
        onClose={() => {
          setShowFutureRefundModal(false);
          setFutureRefundPaymentIntent(null);
        }}
        onConfirm={processFutureRefund}
        paymentIntent={futureRefundPaymentIntent}
        isLoading={loadingAction}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletePaymentIntent(null);
        }}
        onSoftDelete={handleSoftDelete}
        onHardDelete={handleHardDelete}
        paymentIntent={deletePaymentIntent}
        isLoading={loadingAction}
        isSoftDeleted={activeTab === "deleted"}
      />

      {/* Restore Confirmation Modal */}
      <RestoreConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false);
          setRestorePaymentIntent(null);
        }}
        onRestore={confirmRestore}
        paymentIntent={restorePaymentIntent}
        isLoading={loadingAction}
      />

      {/* Edit Modal */}
      {editingPaymentIntent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-4">
            <ComprehensivePaymentIntentEditForm
              paymentIntent={editingPaymentIntent}
              onClose={cancelEditing}
              onUpdate={() => {
                fetchPaymentIntents();
                cancelEditing();
              }}
            />
          </div>
        </div>
      )}

      {/* Booking Group Modal - This is needed for when BookingGroupCard is rendered outside Groups tab */}
      {showGroupModal && selectedGroup && activeTab !== "groups" && (
        <BookingGroupModal
          group={selectedGroup}
          onClose={() => {
            setShowGroupModal(false);
            setSelectedGroup(null);
          }}
          onRefresh={refetch}
          onDelete={async () => {
            // Handle deletion if needed
            setShowGroupModal(false);
            setSelectedGroup(null);
            refetch();
          }}
        />
      )}
    </div>
  )
}
