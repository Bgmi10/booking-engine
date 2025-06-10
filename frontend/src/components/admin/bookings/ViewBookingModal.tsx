"use client"

import { RiCloseLine, RiCalendarEventLine, RiUser3Line, RiMailLine, RiPhoneLine, RiGlobalLine } from "react-icons/ri"
import type { Booking } from "../../../types/types"

interface ViewBookingModalProps {
  booking: Booking | null
  setIsViewModalOpen: (isOpen: boolean) => void
}

export function ViewBookingModal({ booking, setIsViewModalOpen }: ViewBookingModalProps) {
  if (!booking) return null

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  // Calculate number of nights
  const calculateNights = () => {
    const checkIn = new Date(booking.checkIn)
    const checkOut = new Date(booking.checkOut)
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      case "COMPLETED":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row items-start md:space-x-6">
            <div className="w-full md:w-1/3 flex flex-col items-center mb-4 md:mb-0">
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
                <RiCalendarEventLine size={36} />
              </div>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                  booking.status,
                )}`}
              >
                {booking.status}
              </span>
              <p className="text-sm text-gray-500 mt-2">Booking ID: {booking.id.substring(0, 8)}...</p>
            </div>

            <div className="w-full md:w-2/3 space-y-4">
              <div>
                <h4 className="text-sm text-gray-500">Room</h4>
                <p className="text-lg font-medium">{booking.room.name}</p>
                <p className="text-sm text-gray-500">
                  {booking.room.capacity} {booking.room.capacity === 1 ? "person" : "people"} ·{" "}
                  {formatPrice(booking.room.price)}/night
                </p>
              </div>

              <div>
                <h4 className="text-sm text-gray-500">Stay Duration</h4>
                <p className="text-lg">
                  {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                </p>
                <p className="text-sm text-gray-500">{calculateNights()} nights</p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t pt-4">
            <h4 className="font-medium mb-4">Guest Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <RiUser3Line className="mt-1 mr-2 text-gray-400" />
                <div>
                  <h5 className="text-sm text-gray-500">Name</h5>
                  <p>{`${booking.guestFirstName} ${booking.guestMiddleName} ${booking.guestLastName}`}</p>
                </div>
              </div>
              <div className="flex items-start">
                <RiMailLine className="mt-1 mr-2 text-gray-400" />
                <div>
                  <h5 className="text-sm text-gray-500">Email</h5>
                  <p>{booking.guestEmail}</p>
                </div>
              </div>
              {booking.guestPhone && (
                <div className="flex items-start">
                  <RiPhoneLine className="mt-1 mr-2 text-gray-400" />
                  <div>
                    <h5 className="text-sm text-gray-500">Phone</h5>
                    <p>{booking.guestPhone}</p>
                  </div>
                </div>
              )}
              {booking.guestNationality && (
                <div className="flex items-start">
                  <RiGlobalLine className="mt-1 mr-2 text-gray-400" />
                  <div>
                    <h5 className="text-sm text-gray-500">Nationality</h5>
                    <p>{booking.guestNationality}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {booking.paymentIntent && (
            <div className="mt-8 border-t pt-4">
              <h4 className="font-medium mb-4">Payment Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm text-gray-500">Amount</h5>
                  <p>{formatPrice(booking.paymentIntent.amount)}</p>
                </div>
                <div>
                  <h5 className="text-sm text-gray-500">Status</h5>
                  <p className="capitalize">{booking.paymentIntent.status.toLowerCase()}</p>
                </div>
                <div>
                  <h5 className="text-sm text-gray-500">Payment Method</h5>
                  <p className="capitalize">{booking.paymentIntent.paymentMethod.toLowerCase()}</p>
                </div>
                <div>
                  <h5 className="text-sm text-gray-500">Payment Date</h5>
                  <p>{formatDate(booking.paymentIntent.createdAt)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 border-t pt-4">
            <h4 className="font-medium mb-2">Booking Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-500 mt-1"></div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Booking Created</p>
                  <p className="text-xs text-gray-500">{formatDate(booking.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 h-4 w-4 rounded-full bg-blue-500 mt-1"></div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-xs text-gray-500">{formatDate(booking.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsViewModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
