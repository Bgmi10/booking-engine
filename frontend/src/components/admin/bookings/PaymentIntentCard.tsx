import { useState } from "react"
import { differenceInDays, format, formatDistanceToNow } from "date-fns"
import {
  Calendar,
  CreditCard,
  DollarSign,
  Eye,
  Mail,
  MapPin,
  Save,
  Trash2,
  X,
  Users,
} from "lucide-react"
import { getStatusColor } from "../../../utils/helper"
import type { PaymentIntentCardProps } from "../../../types/types"

export default function PaymentIntentCard({
  paymentIntent,
  onViewDetails,
  onSendEmail,
  onCancel,
  onRefund,
  onViewPayment,
  onEdit,
  onDelete,
  loadingAction,
  isEditing,
  editFormData,
  onUpdateEditFormData,
  onSaveEdit,
  onCancelEdit,
  generateConfirmationNumber,
  selectionMode = false,
  selectedBookingIds = [],
  onBookingSelect = () => {},
}: PaymentIntentCardProps) {
  const totalBookings = paymentIntent.bookingData.length
  const totalNights = paymentIntent.bookingData.reduce((sum, booking) => {
    const checkIn = new Date(booking.checkIn)
    const checkOut = new Date(booking.checkOut)
    return sum + differenceInDays(checkOut, checkIn)
  }, 0)

  const displayData = isEditing && editFormData ? editFormData : paymentIntent

  const [showConfirmEmail, setShowConfirmEmail] = useState(false)
  const [showConfirmRefund, setShowConfirmRefund] = useState(false)

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayData.customerData.firstName}
                    onChange={(e) => onUpdateEditFormData("customerData.firstName", e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-lg font-semibold"
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    value={displayData.customerData.lastName}
                    onChange={(e) => onUpdateEditFormData("customerData.lastName", e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-lg font-semibold"
                    placeholder="Last Name"
                  />
                </div>
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">
                  {displayData.customerData.firstName} {displayData.customerData.lastName}
                </h3>
              )}
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayData.status)}`}
              >
                {displayData.status}
              </span>
              {displayData.createdByAdmin && (
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  Admin Created
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Confirmation: {generateConfirmationNumber(displayData)}</p>
              {isEditing ? (
                <input
                  type="email"
                  value={displayData.customerData.email}
                  onChange={(e) => onUpdateEditFormData("customerData.email", e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                  placeholder="Email"
                />
              ) : (
                <p className="text-sm text-gray-600">{displayData.customerData.email}</p>
              )}
              {displayData.createdByAdmin && displayData.adminNotes && (
                <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  <strong>Admin Notes:</strong> {displayData.adminNotes}
                </p>
              )}
              {!displayData.createdByAdmin && displayData.customerData.specialRequests && (
                <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  <strong>Special Requests:</strong> {displayData.customerData.specialRequests}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">€{displayData.totalAmount}</div>
            <div className="text-sm text-gray-600">
              {totalBookings} booking{totalBookings !== 1 ? "s" : ""} • {totalNights} night
              {totalNights !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Bookings Summary */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Bookings ({totalBookings})</h4>
          <div className="grid gap-2">
            {displayData.bookingData.map((booking, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center">
                {selectionMode && (
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={selectedBookingIds.includes(booking.id)}
                    onChange={e => onBookingSelect(booking.id, e.target.checked)}
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{booking.roomDetails?.name || "Room"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {format(new Date(booking.checkIn), "MMM dd")} - {format(new Date(booking.checkOut), "MMM dd")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>
                      {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button
                onClick={onSaveEdit}
                disabled={loadingAction}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </button>
              <button
                onClick={onCancelEdit}
                disabled={loadingAction}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onViewDetails}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </button>

              {/* Send Email with Confirmation */}
              {paymentIntent.status === "SUCCEEDED" && (
                <>
                  {showConfirmEmail ? (
                    <>
                      <button
                        onClick={onSendEmail}
                        disabled={loadingAction}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Confirm Send Email
                      </button>
                      <button
                        onClick={() => setShowConfirmEmail(false)}
                        className="text-sm text-gray-600 underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowConfirmEmail(true)}
                      disabled={loadingAction}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Send Email
                    </button>
                  )}
                </>
              )}

              {/* View Payment */}
              {paymentIntent.stripePaymentIntentId && (
                <button
                  onClick={onViewPayment}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Payment Details
                </button>
              )}

              {/* Delete */}
              <button
                onClick={onDelete}
                disabled={loadingAction}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>

              {/* Cancel & Refund with Confirmation */}
              {paymentIntent.status === "SUCCEEDED" && (
                <>
                  {showConfirmRefund ? (
                    <>
                      <button
                        onClick={onRefund}
                        disabled={loadingAction}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700"
                      >
                        Confirm Refund
                      </button>
                      <button
                        onClick={() => setShowConfirmRefund(false)}
                        className="text-sm text-gray-600 underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowConfirmRefund(true)}
                      disabled={loadingAction}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700 transition-colors"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Cancel & Refund
                    </button>
                  )}
                </>
              )}

              {/* Cancel Booking (Pending/Link Sent) */}
              {(paymentIntent.status === "PAYMENT_LINK_SENT" || paymentIntent.status === "PENDING") && (
                <button
                  onClick={onRefund}
                  disabled={loadingAction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Cancel Booking
                </button>
              )}

              {/* Payment Link Expiry */}
              {paymentIntent.expiresAt && (
                <div className="flex items-center justify-end">
                  <span>
                    Payment link expires {formatDistanceToNow(new Date(paymentIntent.expiresAt), { addSuffix: true })}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
