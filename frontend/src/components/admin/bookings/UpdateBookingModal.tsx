/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { RiCloseLine, RiCheckLine, RiErrorWarningLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import { baseUrl } from "../../../utils/constants"
import type { Booking, Room } from "../../../types/types"


interface UpdateBookingModalProps {
  booking: Booking | null
  setIsUpdateModalOpen: (isOpen: boolean) => void
  setBookings: (bookings: Booking[]) => void
  bookings: Booking[]
  setError: (error: string) => void
  setSuccess: (success: string) => void
}

export function UpdateBookingModal({
  booking,
  setIsUpdateModalOpen,
  setBookings,
  bookings,
  setError,
  setSuccess,
}: UpdateBookingModalProps) {
  const [roomId, setRoomId] = useState("")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestFirstName, setGuestFirstName] = useState("")
  const [guestMiddleName, setGuestMiddleName] = useState("")
  const [guestLastName, setGuestLastName] = useState("")
  const [guestNationality, setGuestNationality] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED">("PENDING")
  const [loadingAction, setLoadingAction] = useState(false)
  const [localError, setLocalError] = useState("")
  const [localSuccess, setLocalSuccess] = useState("")
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)

  // Initialize form with booking data
  useEffect(() => {
    if (booking) {
      setRoomId(booking.roomId)
      setCheckIn(new Date(booking.checkIn).toISOString().split("T")[0])
      setCheckOut(new Date(booking.checkOut).toISOString().split("T")[0])
      setGuestEmail(booking.guestEmail)
      setGuestFirstName(booking.guestFirstName)
      setGuestMiddleName(booking.guestMiddleName || "")
      setGuestLastName(booking.guestLastName)
      setGuestNationality(booking.guestNationality || "")
      setGuestPhone(booking.guestPhone || "")
      setStatus(booking.status)
    }
  }, [booking])

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true)
      try {
        const res = await fetch(`${baseUrl}/admin/rooms/all`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch rooms")
        }

        const data = await res.json()
        setRooms(data.data)
      } catch (error) {
        console.error(error)
        setLocalError("Failed to load rooms. Please try again.")
      } finally {
        setLoadingRooms(false)
      }
    }

    fetchRooms()
  }, [])

  // Update booking
  const updateBooking = async () => {
    if (!booking) return

    // Validation
    if (!roomId) {
      setLocalError("Please select a room")
      return
    }

    if (!checkIn || !checkOut) {
      setLocalError("Check-in and check-out dates are required")
      return
    }

    if (new Date(checkIn) >= new Date(checkOut)) {
      setLocalError("Check-out date must be after check-in date")
      return
    }

    if (!guestEmail.trim()) {
      setLocalError("Guest email is required")
      return
    }

    if (!guestFirstName.trim() || !guestLastName.trim()) {
      setLocalError("Guest name is required")
      return
    }

    setLoadingAction(true)
    setLocalError("")
    setLocalSuccess("")

    try {
      const res = await fetch(`${baseUrl}/admin/bookings/${booking.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          checkIn,
          checkOut,
          guestEmail,
          guestFirstName,
          guestMiddleName,
          guestLastName,
          guestNationality,
          guestPhone,
          status,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to update booking")
      }

      setLocalSuccess("Booking updated successfully!")
      setSuccess("Booking updated successfully!")

      // Find the room details to update the booking
      const room = rooms.find((r) => r.id === roomId) || booking.room

      // Update bookings state
      const updatedBooking = {
        ...booking,
        roomId,
        checkIn,
        checkOut,
        guestEmail,
        guestFirstName,
        guestMiddleName,
        guestLastName,
        guestNationality,
        guestPhone,
        status,
        room,
      }

      setBookings(bookings.map((b) => (b.id === booking.id ? updatedBooking : b)))

      // Close modal after success
      setTimeout(() => {
        setIsUpdateModalOpen(false)
      }, 2000)
    } catch (error: any) {
      console.error(error)
      setLocalError(error.message || "Failed to update booking. Please try again.")
      setError(error.message || "Failed to update booking. Please try again.")
    } finally {
      setLoadingAction(false)
    }
  }

  if (!booking) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">Update Booking</h3>
          <button
            onClick={() => setIsUpdateModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={loadingAction}
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6">
          {localError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiErrorWarningLine className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{localError}</p>
                </div>
              </div>
            </div>
          )}

          {localSuccess && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiCheckLine className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{localSuccess}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1">
                Room *
              </label>
              {loadingRooms ? (
                <div className="flex items-center space-x-2">
                  <BiLoader className="animate-spin text-indigo-600" />
                  <span className="text-sm text-gray-500">Loading rooms...</span>
                </div>
              ) : (
                <select
                  id="room"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loadingAction || loadingRooms}
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - ${room.price}/night
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED")}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loadingAction}
              >
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
                Guest First Name *
              </label>
              <input
                type="text"
                id="guestFirstName"
                value={guestFirstName}
                onChange={(e) => setGuestFirstName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="John Doe"
                disabled={loadingAction}
              />
            </div>

            <div>
              <label htmlFor="guestMiddleName" className="block text-sm font-medium text-gray-700 mb-1">
                Guest Middle Name
              </label>
              <input
                type="text"
                id="guestMiddleName"
                value={guestMiddleName}
                onChange={(e) => setGuestMiddleName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="John Doe"
                disabled={loadingAction}
              />
            </div>

            <div>
              <label htmlFor="guestLastName" className="block text-sm font-medium text-gray-700 mb-1">
                Guest Last Name *
              </label>
              <input
                type="text"
                id="guestLastName"
                value={guestLastName}
                onChange={(e) => setGuestLastName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="John Doe"
                disabled={loadingAction}
              />
            </div>

            <div>
              <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Guest Email *
              </label>
              <input
                type="email"
                id="guestEmail"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="john.doe@example.com"
                disabled={loadingAction}
              />
            </div>

            <div>
              <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Guest Phone
              </label>
              <input
                type="tel"
                id="guestPhone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
                disabled={loadingAction}
              />
            </div>

            <div>
              <label htmlFor="guestNationality" className="block text-sm font-medium text-gray-700 mb-1">
                Guest Nationality
              </label>
              <input
                type="text"
                id="guestNationality"
                value={guestNationality}
                onChange={(e) => setGuestNationality(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="USA"
                disabled={loadingAction}
              />
            </div>

            <div>
              <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Date *
              </label>
              <input
                type="date"
                id="checkIn"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loadingAction}
              />
            </div>

            <div>
              <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700 mb-1">
                Check-out Date *
              </label>
              <input
                type="date"
                id="checkOut"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loadingAction}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsUpdateModalOpen(false)}
            disabled={loadingAction}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            onClick={updateBooking}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Updating...
              </span>
            ) : (
              "Update Booking"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
