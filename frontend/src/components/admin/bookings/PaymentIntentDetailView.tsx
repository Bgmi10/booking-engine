import { CreditCard, DollarSign, Mail, MapPin, RefreshCw, Trash, Users, Settings, Eye } from "lucide-react"
import type { PaymentIntentDetailsViewProps } from "../../../types/types"
import { differenceInDays, format } from "date-fns"
import { getStatusColor } from "../../../utils/helper"
import { baseUrl } from "../../../utils/constants"
import CustomPartialRefundModal from "./CustomPartialRefundModal"
import BookingOverviewModal from "./BookingOverviewModal"
import { useState } from "react"

  export default function PaymentIntentDetailsView({
    paymentIntent,
    paymentDetails,
    loadingPayment,
    onSendEmail,
    onDelete,
    onRestore,
    onRefund,
    onViewPayment,
    onRefresh,
    loadingAction,
    generateConfirmationNumber,
    isDeletedTab = false,
  }: PaymentIntentDetailsViewProps) {
    const [showCustomPartialRefundModal, setShowCustomPartialRefundModal] = useState(false);
    const [showBookingOverviewModal, setShowBookingOverviewModal] = useState(false);

    const handleCustomRefundSuccess = () => {
      // Refresh the payment intent data
      window.location.reload(); // Simple approach, could be improved with proper state management
    };

    return (
      <>
      <div className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Users
              //@ts-ignore
              className="h-5 w-5" />
              Customer Information
            </h3>
            <button
              onClick={() => setShowBookingOverviewModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Eye className="h-4 w-4 mr-2" />
              View payments
            </button>
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
                      {booking.selectedRateOption && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-500">Rate Policy Applied</label>
                          <div className="font-medium text-gray-900">{booking.selectedRateOption.name}</div>
                          <div className="text-sm text-gray-600">{booking.selectedRateOption.description}</div>
                        </div>
                      )}
                    </div>
  
                    {/* Rate Policy Details */}
                    {booking.selectedRateOption && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="text-sm font-semibold text-blue-800 mb-2 block">Policy Terms & Conditions</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${booking.selectedRateOption.refundable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-blue-900">
                              {booking.selectedRateOption.refundable ? 'Refundable' : 'Non-refundable'}
                            </span>
                          </div>
                          
                          {booking.selectedRateOption.cancellationPolicy && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              <span className="text-blue-900 capitalize">
                                {booking.selectedRateOption.cancellationPolicy.toLowerCase().replace('_', ' ')} cancellation
                              </span>
                            </div>
                          )}
                          
                          {booking.selectedRateOption.paymentStructure && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              <span className="text-blue-900">
                                {booking.selectedRateOption.paymentStructure === 'SPLIT_PAYMENT' ? 'Split payment (30% + 70%)' : 'Full payment required'}
                              </span>
                            </div>
                          )}
                          
                          {booking.selectedRateOption.fullPaymentDays && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              <span className="text-blue-900">
                                Final payment due {booking.selectedRateOption.fullPaymentDays} days before arrival
                              </span>
                            </div>
                          )}
                          
                          {booking.selectedRateOption.changeAllowedDays && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                              <span className="text-blue-900">
                                Changes allowed up to {booking.selectedRateOption.changeAllowedDays} days before
                              </span>
                            </div>
                          )}
                          
                        </div>
                        
                        {/* Admin Decision Support */}
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs text-amber-800 font-medium">
                            💡 <strong>Admin Note:</strong> Use these policy terms to make refund and modification decisions. 
                            {!booking.selectedRateOption.refundable && " This booking selected a non-refundable rate."}
                            {booking.selectedRateOption.paymentStructure === 'SPLIT_PAYMENT' && " This booking uses split payment structure."}
                          </p>
                        </div>
                      </div>
                    )}

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

            {/* Payment Structure Information */}
            {paymentIntent.paymentStructure && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Payment Structure</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-blue-600">Payment Type</label>
                    <div className="font-medium text-blue-900">
                      {paymentIntent.paymentStructure === 'SPLIT_PAYMENT' ? 'Split Payment (30% + 70%)' : 'Full Payment'}
                    </div>
                  </div>
                  {paymentIntent.paymentStructure === 'SPLIT_PAYMENT' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-blue-600">Prepaid Amount</label>
                        <div className="font-medium text-blue-900">€{paymentIntent.prepaidAmount || 0}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-blue-600">Remaining Amount</label>
                        <div className="font-medium text-blue-900">€{paymentIntent.remainingAmount || 0}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-blue-600">Remaining Due Date</label>
                        <div className="font-medium text-blue-900">
                          {paymentIntent.remainingDueDate 
                            ? format(new Date(paymentIntent.remainingDueDate), "MMM dd, yyyy")
                            : "Not set"
                          }
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
              
                {paymentIntent.paymentStructure === 'SPLIT_PAYMENT' &&
                //@ts-ignore
                paymentIntent?.remainingAmount > 0 && (
                  <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-yellow-800">
                        Remaining payment of €{paymentIntent.remainingAmount} required
                      </span>
                      {paymentIntent.remainingDueDate && new Date() > new Date(paymentIntent.remainingDueDate) && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-md">
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    {/* Second Payment Status Display */}
                    {paymentIntent.secondPaymentStatus && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-600">Second Payment Status: </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${
                          paymentIntent.secondPaymentStatus === 'SUCCEEDED' 
                            ? 'bg-green-100 text-green-800'
                            : paymentIntent.secondPaymentStatus === 'FAILED' || paymentIntent.secondPaymentStatus === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : paymentIntent.secondPaymentStatus === 'EXPIRED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {paymentIntent.secondPaymentStatus}
                        </span>
                      </div>
                    )}
                    
                    {/* Admin Actions for Second Payment - Only show if second payment not succeeded */}
                    {paymentIntent.secondPaymentStatus !== 'SUCCEEDED' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(baseUrl + `/payment-intent/${paymentIntent.id}/create-second-payment`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                alert('Second payment intent created successfully! Email sent to customer.');
                                console.log('Payment intent created:', data.data.paymentIntentId);
                              } else {
                                const error = await response.json();
                                alert(`Error: ${error.message}`);
                              }
                            } catch (error) {
                              console.error('Error creating payment link:', error);
                              alert('Failed to create payment intent');
                            }
                          }}
                          disabled={loadingAction}
                          className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create Payment Intent
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(baseUrl + `/payment-intent/${paymentIntent.id}/send-reminder`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                              });
                              
                              if (response.ok) {
                                alert('Payment reminder sent successfully!');
                              } else {
                                const error = await response.json();
                                alert(`Error: ${error.message}`);
                              }
                            } catch (error) {
                              console.error('Error sending reminder:', error);
                              alert('Failed to send reminder');
                            }
                          }}
                          disabled={loadingAction}
                          className="inline-flex items-center px-3 py-2 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5-5-5h5v-12" />
                          </svg>
                          Send Reminder
                        </button>
                        
                        {paymentIntent.remainingDueDate && new Date() > new Date(paymentIntent.remainingDueDate) && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(baseUrl + `/payment-intent/${paymentIntent.id}/send-reminder`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (response.ok) {
                                  alert('Overdue notice sent successfully!');
                                } else {
                                  const error = await response.json();
                                  alert(`Error: ${error.message}`);
                                }
                              } catch (error) {
                                console.error('Error sending overdue notice:', error);
                                alert('Failed to send overdue notice');
                              }
                            }}
                            disabled={loadingAction}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Send Overdue Notice
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Show dummy refund button when second payment is succeeded */}
                    {paymentIntent.secondPaymentStatus === 'SUCCEEDED' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            alert('Refund functionality will be implemented in the future.');
                          }}
                          disabled={loadingAction}
                          className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 14v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3" />
                          </svg>
                          Refund Second Payment (Coming Soon)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
  
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
              {(paymentIntent.status === "SUCCEEDED") && (
                <>
                  <button
                    onClick={() => setShowCustomPartialRefundModal(true)}
                    disabled={loadingAction}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Custom Partial Refund
                  </button>
                  <button
                    onClick={onRefund}
                    disabled={loadingAction}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Cancel & Refund
                  </button>
                </>
              )}
  
              {
                paymentIntent?.status === "CANCELLED" && !isDeletedTab && <button
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
                isDeletedTab && onRestore && <button
                onClick={onRestore}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restore
              </button>
              }

              {
                isDeletedTab && <button
                onClick={onDelete}
                disabled={loadingAction}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
               <Trash className="h-4 w-4 mr-2" />
                Hard Delete
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

      <CustomPartialRefundModal
        isOpen={showCustomPartialRefundModal}
        onClose={() => setShowCustomPartialRefundModal(false)}
        paymentIntent={paymentIntent}
        onRefundSuccess={handleCustomRefundSuccess}
      />

      <BookingOverviewModal
        isOpen={showBookingOverviewModal}
        onClose={() => setShowBookingOverviewModal(false)}
        paymentIntent={paymentIntent}
        onRefresh={onRefresh}
      />
      </>
    )
  }
  