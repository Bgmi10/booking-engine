"use client"

import { useEffect, useState } from "react"
import { format, differenceInDays } from "date-fns"
import {
  Search,
  RefreshCw,
  Eye,
  Mail,
  X,
  CreditCard,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  AlertTriangle,  
  CheckCircle,
  Filter,
  Plus,
} from "lucide-react"
import { baseUrl } from "../../../utils/constants"
import { CreateBookingModal } from "./CreateBookingModal"
import Occupancy from "./Occupancy"

interface Booking {
  id: string
  guestFirstName: string
  guestMiddleName?: string
  guestLastName: string
  guestEmail: string
  guestPhone: string
  totalGuests: number
  guestNationality?: string
  checkIn: string
  checkOut: string
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED"
  createdAt: string
  updatedAt: string
  roomId: string
  paymentIntentId?: string
  metadata: any
  request?: string
  room: {
    id: string
    name: string
    description: string
    amenities: string[]
    price: number
    capacity: number
  }
  paymentIntent?: {
    id: string
    stripePaymentIntentId?: string
    stripeSessionId?: string
    amount: number
    currency: string
    status: string
    createdByAdmin: boolean
    totalAmount: number
    taxAmount: number
    bookingData: string
    customerData: string
    payments: Array<{
      id: string
      stripePaymentIntentId?: string
      stripeSessionId?: string
      amount: number
      currency: string
      status: string
      createdAt: string
    }>
  }
  enhancementBookings: Array<{
    id: string
    quantity: number
    enhancement: {
      id: string
      title: string
      description: string
      price: number
      pricingType: string
    }
  }>
}

interface PaymentDetails {
  id: string
  amount: number
  currency: string
  status: string
  created: number
  payment_method?: {
    card?: {
      brand: string
      last4: string
      exp_month: number
      exp_year: number
    }
  }
  billing_details?: {
    name?: string
    email?: string
    address?: {
      city?: string
      country?: string
      postal_code?: string
    }
  }
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/all`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      setBookings(data.data || [])
      setFilteredBookings(data.data || [])
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
      setAlert({ type: "error", message: "Failed to load bookings" })
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
      setAlert({ type: "error", message: "Failed to load payment details" })
    } finally {
      setLoadingPayment(false)
    }
  }

  const sendConfirmationEmail = async (bookingId: string) => {
    setLoadingAction(true)
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/${bookingId}/send-confirmation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      if (response.ok) {
        setAlert({ type: "success", message: "Confirmation email sent successfully" })
      } else {
        throw new Error("Failed to send email")
      }
    } catch (error) {
      setAlert({ type: "error", message: "Failed to send confirmation email" })
    } finally {
      setLoadingAction(false)
    }
  }

  const cancelAndRefundBooking = async (booking: Booking) => {
    setLoadingAction(true)
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: booking.paymentIntent?.id,
          bookingData: JSON.stringify(booking),
          customerDetails: booking.paymentIntent?.customerData,
        }),
      })

      if (response.status === 200) {
        setAlert({ type: "success", message: "Booking cancelled and refunded successfully" })
        fetchBookings() // Refresh bookings
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to process refund")
      }
    } catch (error: any) {
      setAlert({ type: "error", message: error.message || "Failed to cancel and refund booking" })
    } finally {
      setLoadingAction(false)
    }
  }


  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    let filtered = bookings

    // Filter by tab (admin created vs all)
    if (activeTab === "admin") {
      filtered = filtered.filter((booking) => booking.paymentIntent?.createdByAdmin)
    }

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((booking) => booking.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (booking) =>
          booking.guestFirstName.toLowerCase().includes(term) ||
          booking.guestLastName.toLowerCase().includes(term) ||
          booking.guestEmail.toLowerCase().includes(term) ||
          booking.room.name.toLowerCase().includes(term) ||
          booking.id.toLowerCase().includes(term),
      )
    }

    setFilteredBookings(filtered)
  }, [bookings, activeTab, statusFilter, searchTerm])


  const generateConfirmationNumber = (booking: Booking) => {
    return `BK-${booking.id.slice(0, 8).toUpperCase()}`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600 mt-1">Manage reservations, payments, and guest communications</p>
        </div>
        <div className="gap-2 flex">
          <button
            onClick={fetchBookings}
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
      {
        isCreateModalOpen && <CreateBookingModal setIsCreateModalOpen={setIsCreateModalOpen} />
      }

      {alert && (
        <div
          className={`p-4 rounded-lg border-l-4 ${
            alert.type === "error"
              ? "border-red-500 bg-red-50 text-red-700"
              : "border-green-500 bg-green-50 text-green-700"
          }`}
        >
          <div className="flex items-center">
            {alert.type === "error" ? (
              <AlertTriangle className="h-5 w-5 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            <span>{alert.message}</span>
          </div>
        </div>
      )}

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
            onClick={() => setActiveTab("occupancy")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "occupancy"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Occupancy
          </button>
        </nav>
      </div>

      {/* Render Occupancy tab or normal UI */}
      {activeTab === "occupancy" ? (
        <Occupancy bookings={bookings} />
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
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
          </div>

          {/* Bookings List */}
          <BookingsList
            bookings={filteredBookings}
            loading={loading}
            onViewDetails={(booking) => setSelectedBooking(booking)}
            onSendEmail={sendConfirmationEmail}
            //@ts-ignore
            onCancel={cancelAndRefundBooking}
            onRefund={cancelAndRefundBooking}
            onViewPayment={fetchPaymentDetails}
            loadingAction={loadingAction}
          />

          {/* Booking Details Modal */}
          {selectedBooking && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
                    <p className="text-sm text-gray-600">Confirmation: {generateConfirmationNumber(selectedBooking)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <BookingDetailsView
                    booking={selectedBooking}
                    paymentDetails={paymentDetails}
                    loadingPayment={loadingPayment}
                    onSendEmail={() => sendConfirmationEmail(selectedBooking.id)}
                    //@ts-ignore
                    onCancel={() => cancelBooking(selectedBooking.id)}
                    onRefund={() => cancelAndRefundBooking(selectedBooking)}
                    onViewPayment={() =>
                      selectedBooking.paymentIntent?.stripePaymentIntentId &&
                      fetchPaymentDetails(selectedBooking.paymentIntent.stripePaymentIntentId)
                    }
                    loadingAction={loadingAction}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface BookingsListProps {
  bookings: Booking[]
  loading: boolean
  onViewDetails: (booking: Booking) => void
  onSendEmail: (bookingId: string) => void
  onCancel: (bookingId: string) => void
  onRefund: (booking: Booking) => void
  onViewPayment: (paymentIntentId: string) => void
  loadingAction: boolean
}

function BookingsList({
  bookings,
  loading,
  onViewDetails,
  onSendEmail,
  onCancel,
  onRefund,
  onViewPayment,
  loadingAction,
}: BookingsListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading bookings...</span>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-600">No bookings match your current filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onViewDetails={() => onViewDetails(booking)}
          onSendEmail={() => onSendEmail(booking.id)}
          onCancel={() => onCancel(booking.id)}
          onRefund={() => onRefund(booking)}
          onViewPayment={() =>
            booking.paymentIntent?.stripePaymentIntentId && onViewPayment(booking.paymentIntent.stripePaymentIntentId)
          }
          loadingAction={loadingAction}
        />
      ))}
    </div>
  )
}

interface BookingCardProps {
  booking: Booking
  onViewDetails: () => void
  onSendEmail: () => void
  onCancel: () => void
  onRefund: () => void
  onViewPayment: () => void
  loadingAction: boolean
}

function BookingCard({
  booking,
  onViewDetails,
  onSendEmail,
  onCancel,
  onRefund,
  onViewPayment,
  loadingAction,
}: BookingCardProps) {
  const { nights, pricePerNight } = calculateNightlyBreakdown(booking)

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {booking.guestFirstName} {booking.guestLastName}
              </h3>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
              >
                {booking.status}
              </span>
              {booking.paymentIntent?.createdByAdmin && (
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  Admin Created
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Confirmation: {booking.id} • {booking.guestEmail}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">€{booking.metadata?.totalPrice || 0}</div>
            <div className="text-sm text-gray-600">
              €{pricePerNight.toFixed(2)} per night × {nights} nights
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">{booking.room.name}</div>
              <div className="text-sm text-gray-600">Capacity: {booking.room.capacity}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">
                {format(new Date(booking.checkIn), "MMM dd")} - {format(new Date(booking.checkOut), "MMM dd, yyyy")}
              </div>
              <div className="text-sm text-gray-600">{nights} nights</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">{booking.totalGuests} guests</div>
              <div className="text-sm text-gray-600">{booking.guestPhone}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onViewDetails}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </button>
          <button
            onClick={onSendEmail}
            disabled={loadingAction}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Mail className="h-4 w-4 mr-1" />
            Send Email
          </button>
          {booking.paymentIntent?.stripePaymentIntentId && (
            <button
              onClick={onViewPayment}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Payment Details
            </button>
          )}
          {booking.status === "PENDING" && (
            <button
              onClick={onCancel}
              disabled={loadingAction}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
          )}
          {(booking.status === "CONFIRMED" || booking.status === "PENDING") &&
            booking.paymentIntent?.status === "SUCCEEDED" && (
              <button
                onClick={onRefund}
                disabled={loadingAction}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Cancel & Refund
              </button>
            )}
        </div>
      </div>
    </div>
  )
}

interface BookingDetailsViewProps {
  booking: Booking
  paymentDetails: PaymentDetails | null
  loadingPayment: boolean
  onSendEmail: () => void
  onCancel: () => void
  onRefund: () => void
  onViewPayment: () => void
  loadingAction: boolean
}

function BookingDetailsView({
  booking,
  paymentDetails,
  loadingPayment,
  onSendEmail,
  onCancel,
  onRefund,
  onViewPayment,
  loadingAction,
}: BookingDetailsViewProps) {
  const { nights, pricePerNight } = calculateNightlyBreakdown(booking)


  return (
    <div className="space-y-6">
      {/* Guest Information */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guest Information
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <div className="font-medium text-gray-900">
                {booking.guestFirstName} {booking.guestMiddleName} {booking.guestLastName}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <div className="font-medium text-gray-900">{booking.guestEmail}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <div className="font-medium text-gray-900">{booking.guestPhone}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Nationality</label>
              <div className="font-medium text-gray-900">{booking.guestNationality || "Not specified"}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Guests</label>
              <div className="font-medium text-gray-900">{booking.totalGuests}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Confirmation Number</label>
              <div className="font-medium text-gray-900 font-mono">{booking.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Room & Stay Details */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Room & Stay Details
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{booking.room.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{booking.room.description}</p>
              <div className="flex flex-wrap gap-1">
                {booking.room.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Check-in</label>
                <div className="font-medium text-gray-900">
                  {format(new Date(booking.checkIn), "EEEE, MMMM dd, yyyy")}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Check-out</label>
                <div className="font-medium text-gray-900">
                  {format(new Date(booking.checkOut), "EEEE, MMMM dd, yyyy")}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <div className="font-medium text-gray-900">{nights} nights</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Breakdown
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>
                Room rate (€{pricePerNight.toFixed(2)} × {nights} nights)
              </span>
              <span>€{(pricePerNight * nights).toFixed(2)}</span>
            </div>
            {booking.enhancementBookings.map((enhancement, index) => (
              <div key={index} className="flex justify-between">
                <span>
                  {enhancement.enhancement.title} (×{enhancement.quantity})
                </span>
                <span>€{(enhancement.enhancement.price * enhancement.quantity).toFixed(2)}</span>
              </div>
            ))}
            {booking.paymentIntent?.taxAmount && (
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>€{booking.paymentIntent.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <hr className="border-gray-200" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>€{booking.metadata?.totalPrice || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      {booking.paymentIntent && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.paymentIntent.status)}`}
              >
                {booking.paymentIntent.status}
              </span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Payment Amount</label>
                <div className="font-medium text-gray-900">€{booking.paymentIntent.totalAmount}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Currency</label>
                <div className="font-medium text-gray-900">{booking.paymentIntent.currency.toUpperCase()}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Payment Date</label>
                <div className="font-medium text-gray-900">
                  {booking.paymentIntent.payments[0] &&
                    format(new Date(booking.paymentIntent.payments[0].createdAt), "MMM dd, yyyy HH:mm")}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created By</label>
                <div className="font-medium text-gray-900">
                  {booking.paymentIntent.createdByAdmin ? "Admin" : "Customer"}
                </div>
              </div>
            </div>

            <button
              onClick={onViewPayment}
              disabled={loadingPayment}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
            >
              {loadingPayment ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              View Stripe Payment Details
            </button>

            {paymentDetails && (
              <div className="bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Stripe Payment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {paymentDetails.payment_method?.card && (
                      <>
                        <div>
                          <span className="text-gray-600">Card:</span>
                          <span className="ml-2 font-medium">
                            **** **** **** {paymentDetails.payment_method.card.last4}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Brand:</span>
                          <span className="ml-2 font-medium capitalize">
                            {paymentDetails.payment_method.card.brand}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Expires:</span>
                          <span className="ml-2 font-medium">
                            {paymentDetails.payment_method.card.exp_month}/{paymentDetails.payment_method.card.exp_year}
                          </span>
                        </div>
                      </>
                    )}
                    {paymentDetails.billing_details?.name && (
                      <div>
                        <span className="text-gray-600">Billing Name:</span>
                        <span className="ml-2 font-medium">{paymentDetails.billing_details.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Special Requests */}
      {booking.request && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Special Requests</h3>
          </div>
          <div className="p-6">
            <p className="text-gray-900">{booking.request}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Actions</h3>
        </div>
        <div className="p-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onSendEmail}
              disabled={loadingAction}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Confirmation Email
            </button>
            {booking.status === "PENDING" && (
              <button
                onClick={onCancel}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Booking
              </button>
            )}
            {(booking.status === "CONFIRMED" || booking.status === "PENDING") &&
              booking.paymentIntent?.status === "SUCCEEDED" && (
                <button
                  onClick={onRefund}
                  disabled={loadingAction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cancel & Refund
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "SUCCEEDED":
    case "COMPLETED":
      return "bg-green-100 text-green-800"
    case "PENDING":
    case "PROCESSING":
      return "bg-yellow-100 text-yellow-800"
    case "CANCELLED":
    case "FAILED":
      return "bg-red-100 text-red-800"
    case "REFUNDED":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function calculateNightlyBreakdown(booking: Booking) {
  const checkIn = new Date(booking.checkIn)
  const checkOut = new Date(booking.checkOut)
  const nights = differenceInDays(checkOut, checkIn)
  const totalPrice = booking.metadata?.totalPrice || 0
  const pricePerNight = nights > 0 ? totalPrice / nights : 0

  return { nights, pricePerNight, totalPrice }
}
