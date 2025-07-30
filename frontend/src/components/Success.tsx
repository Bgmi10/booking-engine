import { useState, useEffect } from "react"
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Mail,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Bed,
  ImageIcon,
} from "lucide-react"
import { baseUrl } from "../utils/constants"
import Header from "./Header"
import { generateMergedBookingId } from "../utils/helper"
import type { Booking } from "../types/types"
import { calculateNights } from "../utils/format"

export default function Success() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roomDetailsOpen, setRoomDetailsOpen] = useState<{ [key: string]: boolean }>({})
  const [enhancementsOpen, setEnhancementsOpen] = useState<{ [key: string]: boolean }>({})
  const params = new URLSearchParams(window.location.search)
  const sessionId = params.get("session_id") || params.get("sessionId");

  useEffect(() => {
    if (sessionId) {
      const fetchSession = async () => {
        try {
          const response = await fetch(`${baseUrl}/sessions/${sessionId}`)
          const data = await response.json()
          console.log(data);
          if (response.status === 200) {
            setSessionData(data.data)
            const bookingData = JSON.parse(data.data.data.bookingData)
            const actualBookings = data.data.data.bookings || []

            // Merge bookingData with actual booking records
            const mergedBookings = bookingData.map((bookingItem: any, index: number) => {
              // Find the matching actual booking by room and dates
              const actualBooking = actualBookings.find((actual: any) => actual.id) || {}
              
              return {
                ...bookingItem,
                id: actualBookings[index]?.id, // Get ID from the corresponding index
                status: actualBooking.status || 'CONFIRMED' // Default to CONFIRMED for successful payments
              }
            })
            
            const roomStates: { [key: string]: boolean } = {}
            const enhancementStates: { [key: string]: boolean } = {}
            //@ts-ignore
            mergedBookings.forEach((booking: any, index: number) => {
              roomStates[index] = true
              enhancementStates[index] = true
            })
            setRoomDetailsOpen(roomStates)
            setEnhancementsOpen(enhancementStates)
          } else {
            setError(data.message || "Failed to retrieve booking details")
          }
        } catch (err) {
          setError("Network error occurred. Please try again.")
        } finally {
          setLoading(false)
        }
      }
      fetchSession()
    } else {
      setError("No session ID found")
      setLoading(false)
    }
  }, [sessionId])

  const formatDate = (date: string) => {
    if (!date) return ""
    const d = new Date(date)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  } 

 
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case "PENDING":
        return <Clock className="w-12 h-12 text-yellow-500" />
      case "FAILED":
        return <XCircle className="w-12 h-12 text-red-500" />
      default:
        return <CheckCircle className="w-12 h-12 text-green-500" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return "Your bookings have been confirmed!"
      case "PENDING":
        return "Your bookings are being processed"
      case "FAILED":
        return "Booking failed"
      default:
        return "Thank you for your bookings!"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return "text-green-600"
      case "PENDING":
        return "text-yellow-600"
      case "FAILED":
        return "text-red-600"
      default:
        return "text-green-600"
    }
  }

  const toggleRoomDetails = (bookingIndex: number) => {
    setRoomDetailsOpen((prev) => ({
      ...prev,
      [bookingIndex]: !prev[bookingIndex],
    }))
  }

  const toggleEnhancements = (bookingIndex: number) => {
    setEnhancementsOpen((prev) => ({
      ...prev,
      [bookingIndex]: !prev[bookingIndex],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = "/booking")}
            className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Return to Booking
          </button>
        </div>
      </div>
    )
  }

  if (!sessionData) {
    return null
  }

  // Parse and merge the booking data with actual booking records
  const bookingData = JSON.parse(sessionData?.data?.bookingData)
  
  const actualBookings = sessionData?.data?.bookings || []
  const bookings = bookingData.map((bookingItem: any, index: number) => ({
    ...bookingItem,
    id: actualBookings[index]?.id,
    status: 'CONFIRMED' // Since this is a success page, we know the bookings are confirmed
  }))

  const customerData = JSON.parse(sessionData.data.customerData)
  const payment = sessionData.data
  const totalRooms = bookings.length
  const arrayofBookingIds = [...bookings.map((booking: Booking) =>booking.id)];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center mb-6">
            {getStatusIcon(payment?.status)}
            <h1 className={`text-2xl sm:text-3xl font-semibold mt-4 mb-2 ${getStatusColor(payment?.status)}`}>
              {getStatusMessage(payment?.status)}
            </h1>

            {payment?.status === "SUCCEEDED" && customerData && (
              <div className="flex items-center justify-center gap-2 text-gray-600 mb-4 flex-wrap">
                <Mail className="w-5 h-5" />
                <p className="text-sm sm:text-base">
                  We've sent booking confirmations to <strong>{customerData.email}</strong>
                </p>
              </div>
            )}

            {payment?.status === "PENDING" && (
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                Your payment is being processed. You'll receive confirmation emails shortly.
              </p>
            )}

            {payment?.status === "FAILED" && (
              <div className="mb-4">
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  Your payment could not be processed. Please try again.
                </p>
                <button
                  onClick={() => (window.location.href = "/booking")}
                  className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Booking Summary */}
          {bookings.length > 0 && payment?.status === "SUCCEEDED" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Booking Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{totalRooms}</div>
                  <div className="text-sm text-gray-600">Room{totalRooms > 1 ? "s" : ""} Booked</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{bookings[0]?.adults || 1}</div>
                  <div className="text-sm text-gray-600">Total Guest{(bookings[0]?.adults || 1) > 1 ? "s" : ""}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">
                    {calculateNights(bookings[0]?.checkIn, bookings[0]?.checkOut)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Night{calculateNights(bookings[0]?.checkIn, bookings[0]?.checkOut) > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guest Information */}
          {customerData && payment?.status === "SUCCEEDED" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Guest Information</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-gray-600">First Name:</span>
                    <span className="font-medium break-all">{customerData.firstName}</span>
                  </div>
                  {customerData.middleName && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600">Middle Name:</span>
                      <span className="font-medium break-all">{customerData.middleName}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-gray-600">Last Name:</span>
                    <span className="font-medium break-all">{customerData.lastName}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium break-all">{customerData.email}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {customerData.phone && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{customerData.phone}</span>
                    </div>
                  )}
                  {customerData.nationality && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600">Nationality:</span>
                      <span className="font-medium">{customerData.nationality}</span>
                    </div>
                  )}
                  {customerData.specialRequests && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600">Special Requests:</span>
                      <span className="font-medium">{customerData.specialRequests}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Individual Booking Details */}
          <div className="mb-4 mr-2">
            <span className="text-gray-600 mb-2">Booking ID: {generateMergedBookingId(arrayofBookingIds)}</span>
          </div>

          {bookings.map((booking: any, index: number) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold text-gray-800">Room {index + 1} Details</h2>
                    <div>
                  </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Room Total</div>
                    <div className="text-lg font-semibold text-gray-800">€{booking.totalPrice}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Stay Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Stay Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Check-in</div>
                        <div className="text-gray-600">{formatDate(booking.checkIn)}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Check-out</div>
                        <div className="text-gray-600">{formatDate(booking.checkOut)}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="font-medium">
                          {booking.adults} adult{booking.adults > 1 ? "s" : ""}
                        </span>
                        <span className="text-gray-600">
                          {" "}
                          • {booking.rooms} room{booking.rooms > 1 ? "s" : ""}
                        </span>
                        <span className="text-gray-600">
                          {" "}
                          • {calculateNights(booking.checkIn, booking.checkOut)} night
                          {calculateNights(booking.checkIn, booking.checkOut) > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Room Details Dropdown */}
                {booking.roomDetails && (
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleRoomDetails(index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Bed className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-medium text-gray-800">{booking.roomDetails.name}</h3>
                      </div>
                      {roomDetailsOpen[index] ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {roomDetailsOpen[index] && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-2">{booking.roomDetails.name}</h4>
                            <p className="text-sm text-gray-600 mb-4">{booking.roomDetails.description}</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Capacity:</span>
                                <span className="font-medium">{booking.roomDetails.capacity} guests</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Base Price:</span>
                                <span className="font-medium">€{booking.roomDetails.price}/night</span>
                              </div>
                              {booking.roomDetails.amenities && booking.roomDetails.amenities.length > 0 && (
                                <div>
                                  <span className="text-gray-600">Amenities:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {booking.roomDetails.amenities.map((amenity: string, amenityIndex: number) => (
                                      <span
                                        key={amenityIndex}
                                        className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                                      >
                                        {amenity}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {booking.selectedRateOption && (
                                <div className="mt-3 p-2 bg-white rounded border">
                                  <div className="text-sm font-medium">{booking.selectedRateOption.name}</div>
                                  <div className="text-xs text-gray-600">{booking.selectedRateOption.description}</div>
                                  {booking.selectedRateOption.refundable && (
                                    <div className="text-xs text-green-600 mt-1">✓ Refundable</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Room Images */}
                          {booking.roomDetails.images && booking.roomDetails.images.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-3">Room Images</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {booking.roomDetails.images.map(
                                  (image: { id: string; url: string }, imageIndex: number) => (
                                    <div key={image.id} className="relative group">
                                      <img
                                        src={image.url || "/placeholder.svg"}
                                        alt={`Room view ${imageIndex + 1}`}
                                        className="w-full h-32 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.src = "/placeholder.svg?height=128&width=200"
                                        }}
                                      />
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Enhancements */}
                {booking.selectedEnhancements && booking.selectedEnhancements.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleEnhancements(index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-medium text-gray-800">Selected Enhancements</h3>
                      </div>
                      {enhancementsOpen[index] ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {enhancementsOpen[index] && (
                      <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="space-y-4">
                          {booking.selectedEnhancements.map((enhancement: any, enhancementIndex: number) => (
                            <div key={enhancementIndex} className="bg-white rounded-lg p-4 shadow-sm">
                              <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-grow">
                                  <h4 className="font-medium text-gray-800 mb-1">
                                    {enhancement.title || enhancement.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">{enhancement.description}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-medium text-sm">€{enhancement.price}</div>
                                  <div className="text-xs text-gray-600">
                                    {enhancement.pricingType === "PER_GUEST" ? "per guest" : "per room"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Voucher Applied */}
          {payment?.voucherCode && payment?.status === "SUCCEEDED" && (
            <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4 sm:p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h3 className="text-lg font-medium text-green-800">Voucher Applied</h3>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Voucher Code: <strong>{payment.voucherCode}</strong></span>
                {payment.voucherUsages && payment.voucherUsages.length > 0 && payment.voucherUsages[0].discountAmount > 0 && (
                  <span className="text-green-600 font-semibold">
                    Saved €{payment.voucherUsages[0].discountAmount.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Voucher Products */}
              {payment.voucherUsages && payment.voucherUsages.length > 0 && (() => {
                const products = JSON.parse(payment.voucherUsages[0].productsReceived || '[]');
                return products && products.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-800 mb-3">What you received:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {products.map((product: any, productIndex: number) => (
                        <div key={productIndex} className="bg-white rounded-lg p-3 border border-green-200">
                          <div className="flex items-start gap-3">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-grow">
                              <h5 className="font-medium text-gray-800 text-sm">{product.name}</h5>
                              <p className="text-xs text-gray-600 mt-1">{product.description}</p>
                              <span className="text-xs text-green-600 font-medium mt-1 block">
                                Value: €{product.value}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Overall Payment Summary */}
          {bookings.length > 0 && payment?.status === "SUCCEEDED" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">€{(payment.totalAmount - payment.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">€{payment.taxAmount.toFixed(2)}</span>
                </div>
                {payment.voucherUsages && payment.voucherUsages.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="font-medium text-green-600">
                      -€{payment.voucherUsages.reduce((total: number, usage: any) => total + (usage.discountAmount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-medium">Total Amount Paid:</span>
                  <span className="font-semibold">€{payment.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Status:</span>
                  <span
                    className={`font-medium ${payment.status === "SUCCEEDED" ? "text-green-600" : "text-yellow-600"}`}
                  >
                    {payment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Date:</span>
                  <span className="font-medium">{formatDate(payment.paidAt || payment.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rooms:</span>
                  <span className="font-medium">{totalRooms}</span>
                </div>
              </div>
            </div>
            
          )}

<>
            
{/*              
              {receiptUrl && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
                  <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-medium text-gray-800">Payment Receipt</h3>
                    </div>
                    <a 
                      href={receiptUrl}
                      download="payment-receipt.pdf"
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Download PDF</span>
                    </a>
                  </div>
                </div>
              )} */}
            </>

          {/* Footer Actions */}
          {payment?.status === "SUCCEEDED" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-center"
                >
                  Print Confirmations
                </button>
                <button
                  onClick={() => (window.location.href = "/")}
                  className="flex-1 bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-center"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
