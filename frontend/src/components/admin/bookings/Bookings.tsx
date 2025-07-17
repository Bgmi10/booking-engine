import { useEffect, useState } from "react"
import {
  Search,
  RefreshCw,
  X,
  Filter,
  Plus,
 } from "lucide-react"
import { baseUrl } from "../../../utils/constants"
import { generateMergedBookingId } from "../../../utils/helper"
import { CreateBookingModal } from "./CreateBookingModal"
import Occupancy from "./Occupancy"
import type { PaymentDetails, PaymentIntent } from "../../../types/types"
import PaymentIntentsList from "./PaymenItentList"
import PaymentIntentDetailsView from "./PaymentIntentDetailView"
import toast from 'react-hot-toast';

export default function BookingManagement() {
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>([])
  const [filteredPaymentIntents, setFilteredPaymentIntents] = useState<PaymentIntent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL")
  const [selectedPaymentIntent, setSelectedPaymentIntent] = useState<PaymentIntent | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPaymentIntent, setEditingPaymentIntent] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<PaymentIntent | null>(null)
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([])
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [primaryEmail, setPrimaryEmail] = useState("")
  const [groupLoading, setGroupLoading] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false);
  const [tempHolds, setTempHolds] = useState<any[] | null>(null);
  const [loadingTempHoldDelete, setLoadingTempHoldDelete] = useState<string | null>(null);

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
    }
  }, [activeTab])

  const fetchPaymentIntents = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/all`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (response.status === 200 && data) {
        const parseData = data.data.map((item: PaymentIntent) => {
          return {
            ...item,
            //@ts-ignore
            bookingData: item.bookingData ? JSON.parse(item.bookingData) : [],
            //@ts-ignore
            customerData: item.customerData ? JSON.parse(item.customerData) : {},
          }
        })

        setPaymentIntents(parseData)
        setFilteredPaymentIntents(parseData)
      }
    } catch (error) {
      console.error("Failed to fetch payment intents:", error)
      toast.error("Failed to load payment intents")
    } finally {
      setLoading(false)
    }
  }

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

  const deletePaymentIntent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment intent? This action cannot be undone.")) {
      return
    }

    setLoadingAction(true)
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/${id}/delete`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        toast.success("Payment intent deleted successfully")
        fetchPaymentIntents()
        setSelectedPaymentIntent(null)
      } else {
        throw new Error("Failed to delete payment intent")
      }
    } catch (error) {
      toast.error("Failed to delete payment intent")
    } finally {
      setLoadingAction(false)
    }
  }

  const updatePaymentIntent = async (id: string, data: PaymentIntent) => {
    setLoadingAction(true)
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/${id}/edit`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          customerData: JSON.stringify(data.customerData),
          bookingData: JSON.stringify(data.bookingData),
        }),
      })

      if (response.ok) {
        toast.success("Payment intent updated successfully")
        setEditingPaymentIntent(null)
        setEditFormData(null)
        fetchPaymentIntents()
      } else {
        throw new Error("Failed to update payment intent")
      }
    } catch (error) {
      toast.error("Failed to update payment intent")
    } finally {
      setLoadingAction(false)
    }
  }

  const sendConfirmationEmail = async (paymentIntentId: string) => {
    setLoadingAction(true)
    try {
      const paymentIntent = paymentIntents.find((pi) => pi.id === paymentIntentId)
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
      const paymentIntent = paymentIntents.find((pi) => pi.id === paymentIntentId)
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
    setLoadingAction(true)
    try {
      let reason = '';
      if (paymentIntent.paymentMethod === 'STRIPE') {
        // Only allow Stripe's allowed reasons
        const allowedReasons = [
          { value: 'duplicate', label: 'Duplicate' },
          { value: 'fraudulent', label: 'Fraudulent' },
          { value: 'requested_by_customer', label: 'Requested by Customer' },
        ];
        const reasonPrompt = window.prompt(
          'Enter the number for the refund reason:\n1. Duplicate\n2. Fraudulent\n3. Requested by Customer',
          '3'
        );
        const idx = parseInt(reasonPrompt || '3', 10) - 1;
        reason = allowedReasons[idx]?.value || 'requested_by_customer';
      } else {
        // Allow free-form note for cash/bank transfer
        if (window.confirm('Would you like to add a note for the refund/cancellation?')) {
          reason = window.prompt('Enter the note for the refund/cancellation:', '') || '';
        }
      }
      const response = await fetch(`${baseUrl}/admin/bookings/refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          bookingData: paymentIntent.bookingData,
          customerDetails: paymentIntent.customerData,
          paymentMethod: paymentIntent.paymentMethod || 'STRIPE',
          reason,
        }),
      })

      if (response.status === 200) {
        toast.success("Payment intent cancelled and refunded successfully")
        fetchPaymentIntents()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to process refund")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel and refund payment intent")
    } finally {
      setLoadingAction(false)
    }
  }

  const startEditing = (paymentIntent: PaymentIntent) => {
    setEditingPaymentIntent(paymentIntent.id)
    setEditFormData({ ...paymentIntent })
  }

  const cancelEditing = () => {
    setEditingPaymentIntent(null)
    setEditFormData(null)
  }

  const saveEditing = () => {
    if (editFormData) {
      updatePaymentIntent(editFormData.id, editFormData)
    }
  }

  const updateEditFormData = (field: string, value: any) => {
    if (!editFormData) return

    if (field.startsWith("customerData.")) {
      const customerField = field.replace("customerData.", "")
      setEditFormData({
        ...editFormData,
        customerData: {
          ...editFormData.customerData,
          [customerField]: value,
        },
      })
    } else if (field.startsWith("bookingData.")) {
      const [, index, bookingField] = field.split(".")
      const bookingIndex = Number.parseInt(index)
      const newBookingData = [...editFormData.bookingData]
      newBookingData[bookingIndex] = {
        ...newBookingData[bookingIndex],
        [bookingField]: value,
      }
      setEditFormData({
        ...editFormData,
        bookingData: newBookingData,
      })
    } else {
      setEditFormData({
        ...editFormData,
        [field]: value,
      })
    }
  }

  useEffect(() => {
    fetchPaymentIntents()
  }, [])

  useEffect(() => {
    let filtered = paymentIntents

    // Filter by tab (admin created vs all)
    if (activeTab === "admin") {
      filtered = filtered.filter((pi) => pi.createdByAdmin)
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((pi) => pi.status === statusFilter)
    }

    // Filter by payment method
    if (paymentMethodFilter !== "ALL") {
      filtered = filtered.filter((pi) => pi.paymentMethod === paymentMethodFilter)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (pi) =>
          pi.customerData.firstName?.toLowerCase().includes(term) ||
          pi.customerData.lastName?.toLowerCase().includes(term) ||
          pi.customerData.email?.toLowerCase().includes(term) ||
          pi.id.toLowerCase().includes(term) ||
          pi.bookingData.some((booking) => booking.roomDetails?.name?.toLowerCase().includes(term)),
      )
    }

    setFilteredPaymentIntents(filtered)
  }, [paymentIntents, activeTab, statusFilter, searchTerm, paymentMethodFilter])

  const generateConfirmationNumber = (paymentIntent: PaymentIntent) => {
    if (paymentIntent.bookings.length === 0) {
      return "PROCESSING"
    }
    return generateMergedBookingId(paymentIntent.bookings.map((b) => b.id))
  }

  // Handler for booking selection
  const handleBookingSelect = (bookingId: string, checked: boolean) => {
    setSelectedBookingIds(ids =>
      checked ? [...ids, bookingId] : ids.filter(id => id !== bookingId)
    );
  };

  // Get all bookings flat for selection modal
  const allBookings = filteredPaymentIntents.flatMap(pi =>
    pi.bookingData.map(b => ({
      ...b,
      paymentIntentId: pi.id,
      customer: pi.customerData,
      // @ts-ignore
      groupId: b.groupId,
      // @ts-ignore
      groupName: pi.customerData.groupName,
      // @ts-ignore
      groupEmail: pi.customerData.groupEmail
    }))
  );
  const selectedBookings = allBookings.filter(b => selectedBookingIds.includes(b.id));

  // Grouped Bookings logic for Groups tab (always defined)
  const bookingsForGrouping = filteredPaymentIntents.flatMap(pi =>
    pi.bookingData.map(b => ({
      ...b,
      paymentIntentId: pi.id,
      customer: pi.customerData,
      // @ts-ignore
      groupId: b.groupId,
      // @ts-ignore
      groupName: pi.customerData.groupName,
    }))
  );
  const groupedBookings: Record<string, { name: string, bookings: any[] }> & { individual?: any[] } = bookingsForGrouping.reduce((acc, booking) => {
    if (booking.groupId) {
      if (!acc[booking.groupId]) {
        // @ts-ignore
        acc[booking.groupId] = {
          // @ts-ignore
          name: booking.customer.groupName,
          bookings: []
        };
      }
      acc[booking.groupId].bookings.push(booking);
    } else {
      acc.individual = acc.individual || [];
      acc.individual.push(booking);
    }
    return acc;
  }, {} as Record<string, { name: string, bookings: any[] }> & { individual?: any[] });

  // Delete temp hold handler
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
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
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
            onClick={() => setActiveTab("all")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Bookings
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "admin"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Admin Created
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "groups"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveTab("occupancy")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "occupancy"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Occupancy
          </button>
          <button
            onClick={() => setActiveTab("temp-holds")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "temp-holds"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Temp Holds Rooms 
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
      ) : activeTab === "occupancy" ? (
        <Occupancy bookings={paymentIntents} />
      ) : activeTab === "groups" ? (
        <div className="space-y-8">
          {/* Render Groups */}
          {Object.entries(groupedBookings)
            .filter(([groupId]) => groupId !== "individual")
            .map(([groupId, group]) => (
              <div key={groupId} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <h3 className="text-lg font-bold mb-2 text-blue-700">Group: {(group as any).name || groupId}</h3>
                <ul className="divide-y divide-gray-100">
                  {(group as any).bookings.map((b: any) => (
                    <li key={b.id} className="py-2 flex items-center justify-between">
                      <span>{b.customer?.firstName} {b.customer?.lastName} - {b.roomDetails?.name || b.selectedRoom || (b.roomId ?? "")}</span>
                      <span className="text-xs text-gray-500">{b.checkIn} to {b.checkOut}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {/* Render Individuals */}
          {Array.isArray(groupedBookings['individual']) && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-bold mb-2 text-gray-700">Individual Bookings</h3>
              <ul className="divide-y divide-gray-100">
                {(groupedBookings['individual'] as any[]).map((b: any) => (
                  <li key={b.id} className="py-2 flex items-center justify-between">
                    <span>{b.customer?.firstName} {b.customer?.lastName} - {b.roomDetails?.name || b.selectedRoom || (b.roomId ?? "")}</span>
                    <span className="text-xs text-gray-500">{b.checkIn} to {b.checkOut}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
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

          {/* Create Group Button (toggle selection mode) */}
          {!selectionMode && (
            <div className="mb-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => {
                  setSelectionMode(true);
                  setSelectedBookingIds([]);
                }}
              >
                Create Group
              </button>
            </div>
          )}
          {/* Confirm Selection Button */}
          {selectionMode && (
            <div className="mb-2 flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={selectedBookingIds.length < 2}
                onClick={() => {
                  setShowGroupModal(true);
                  setGroupName("");
                  setPrimaryEmail(selectedBookings[0]?.customer?.email || "");
                }}
              >
                Confirm Selection
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedBookingIds([]);
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Payment Intents List */}
          <PaymentIntentsList
            paymentIntents={filteredPaymentIntents}
            loading={loading}
            onViewDetails={(pi) => setSelectedPaymentIntent(pi)}
            onSendEmail={sendConfirmationEmail}
            onCancel={cancelAndRefundPaymentIntent}
            onRefund={cancelAndRefundPaymentIntent}
            onViewPayment={fetchPaymentDetails}
            onEdit={startEditing}
            onDelete={deletePaymentIntent}
            loadingAction={loadingAction}
            editingPaymentIntent={editingPaymentIntent}
            editFormData={editFormData}
            onUpdateEditFormData={updateEditFormData}
            onSaveEdit={saveEditing}
            onCancelEdit={cancelEditing}
            generateConfirmationNumber={generateConfirmationNumber}
            selectionMode={selectionMode}
            selectedBookingIds={selectedBookingIds}
            onBookingSelect={handleBookingSelect}
            onConfirmBooking={confirmBooking}
          />

          {/* Payment Intent Details Modal */}
          {selectedPaymentIntent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Payment Intent Details</h2>
                    <p className="text-sm text-gray-600">
                      Confirmation: {generateConfirmationNumber(selectedPaymentIntent)}
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
                  <PaymentIntentDetailsView
                  //@ts-ignore
                   onDelete={deletePaymentIntent}
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
                    loadingAction={loadingAction}
                    generateConfirmationNumber={generateConfirmationNumber}
                  />
                </div>
              </div>
            </div>
          )}

          {showGroupModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
                >
                  &times;
                </button>
                <h2 className="text-xl font-bold mb-4">Create Group</h2>
                <form
                  onSubmit={async e => {
                    e.preventDefault()
                    setGroupLoading(true)
                    try {
                      const res = await fetch(baseUrl + "/admin/bookings/group", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          bookingIds: selectedBookingIds,
                          groupName,
                          primaryEmail
                        })
                      })
                      if (res.ok) {
                        setShowGroupModal(false)
                        setSelectedBookingIds([])
                        setGroupName("")
                        setPrimaryEmail("")
                        setSelectionMode(false)
                        fetchPaymentIntents()
                      } else {
                        // Handle error
                      }
                    } finally {
                      setGroupLoading(false)
                    }
                  }}
                >
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <input
                      type="text"
                      className="border rounded px-3 py-2 w-full"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
                    <select
                      className="border rounded px-3 py-2 w-full"
                      value={primaryEmail}
                      onChange={e => setPrimaryEmail(e.target.value)}
                      required
                    >
                      {selectedBookings.map(b => (
                        <option key={b.id} value={b.customer?.email}>{b.customer?.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selected Bookings</label>
                    <ul className="list-disc pl-5 text-sm text-gray-700">
                      {selectedBookings.map(b => (
                        // @ts-ignore
                        <li key={b.id}>{b.customer?.firstName} {b.customer?.lastName} - {b.roomDetails?.name || b.selectedRoom || (b.roomId ?? "")}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      disabled={groupLoading}
                    >
                      {groupLoading ? "Creating..." : "Create Group"}
                    </button>
                    <button
                      type="button"
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                      onClick={() => setShowGroupModal(false)}
                      disabled={groupLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}



