import { CreditCard, DollarSign, Mail, MapPin, RefreshCw, Trash, Users } from "lucide-react"
import type { PaymentIntentDetailsViewProps } from "../../../types/types"
import { differenceInDays, format } from "date-fns"
import { getStatusColor } from "../../../utils/helper"

  export default function PaymentIntentDetailsView({
    paymentIntent,
    paymentDetails,
    loadingPayment,
    onSendEmail,
    onDelete,
    onRefund,
    onViewPayment,
    loadingAction,
    generateConfirmationNumber,
  }: PaymentIntentDetailsViewProps) {
    return (
      <div className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Users
              //@ts-ignore
              className="h-5 w-5" />
              Customer Information
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <div className="font-medium text-gray-900">
                  {paymentIntent.customerData.firstName} {paymentIntent.customerData.middleName}{" "}
                  {paymentIntent.customerData.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="font-medium text-gray-900">{paymentIntent.customerData.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <div className="font-medium text-gray-900">{paymentIntent.customerData.phone}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nationality</label>
                <div className="font-medium text-gray-900">
                  {paymentIntent.customerData.nationality || "Not specified"}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Confirmation Number</label>
                <div className="font-medium text-gray-900 font-mono">{generateConfirmationNumber(paymentIntent)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created By</label>
                <div className="font-medium text-gray-900">{paymentIntent.createdByAdmin ? "Admin" : "Customer"}</div>
              </div>
            </div>
  
            {/* Admin Notes or Special Requests */}
            {paymentIntent.createdByAdmin && paymentIntent.adminNotes && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="text-sm font-medium text-blue-700">Admin Notes</label>
                <div className="text-blue-900 mt-1">{paymentIntent.adminNotes}</div>
              </div>
            )}
  
            {!paymentIntent.createdByAdmin && paymentIntent.customerData.specialRequests && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <label className="text-sm font-medium text-green-700">Special Requests</label>
                <div className="text-green-900 mt-1">{paymentIntent.customerData.specialRequests}</div>
              </div>
            )}
          </div>
        </div>
  
        {/* Bookings Details */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Bookings Details ({paymentIntent.bookingData.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {paymentIntent.bookingData.map((booking, index) => {
                const nights = differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn))
                return (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-900">Booking #{index + 1}</h4>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">€{booking.totalPrice}</div>
                        <div className="text-sm text-gray-600">{nights} nights</div>
                      </div>
                    </div>
  
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Room</label>
                        <div className="font-medium text-gray-900">{booking.roomDetails?.name}</div>
                        <div className="text-sm text-gray-600">{booking.roomDetails?.description}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Capacity & Guests</label>
                        <div className="font-medium text-gray-900">
                          {booking.adults} adults (Capacity: {booking.roomDetails?.capacity})
                        </div>
                      </div>
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
                    </div>
  
                    {booking.roomDetails?.amenities && booking.roomDetails.amenities.length > 0 && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-500">Amenities</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {booking.roomDetails.amenities.map((amenity, idx) => (
                            <span
                              key={idx}
                              className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-md"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
  
        {/* Payment Information */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(paymentIntent.status)}`}
              >
                {paymentIntent.status}
              </span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <div className="font-medium text-gray-900">€{paymentIntent.totalAmount}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Currency</label>
                <div className="font-medium text-gray-900">{paymentIntent.currency.toUpperCase()}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tax Amount</label>
                <div className="font-medium text-gray-900">€{paymentIntent.taxAmount}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Payment Date</label>
                <div className="font-medium text-gray-900">
                  {paymentIntent.paidAt ? format(new Date(paymentIntent.paidAt), "MMM dd, yyyy HH:mm") : "Not paid"}
                </div>
              </div>
            </div>
  
            {paymentIntent.stripePaymentIntentId && (
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
            )}
  
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
                          <span className="ml-2 font-medium capitalize">{paymentDetails.payment_method.card.brand}</span>
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
  
        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Actions</h3>
          </div>
          <div className="p-6">
            <div className="flex gap-2 flex-wrap">
             {paymentIntent.status === "SUCCEEDED"  && <button
                onClick={onSendEmail}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Confirmation Email
              </button>}
              {(paymentIntent.status === "SUCCEEDED" || paymentIntent.status === "PENDING") && (
                <button
                  onClick={onRefund}
                  disabled={loadingAction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cancel & Refund
                </button>
              )}
  
              {
                paymentIntent?.status === "CANCELLED" &&  <button
                //@ts-ignore
                onClick={() => onDelete(paymentIntent.id)}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
               <Trash />
                Delete
              </button>
              }
  
              {
                paymentIntent.status === "PAYMENT_LINK_SENT" && (
                  <button
                  onClick={onRefund}
                  disabled={loadingAction}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cancel Booking
                </button>
                )
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
  