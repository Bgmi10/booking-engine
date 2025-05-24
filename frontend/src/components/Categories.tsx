/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import type React from "react"

/* eslint-disable @typescript-eslint/no-explicit-any */
import { format, differenceInDays, isWithinInterval, parseISO, isBefore, addDays } from "date-fns"
import { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronUp,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
} from "lucide-react"
import BookingSummary from "./BookingSummary"

export default function Categories({
  availabilityData,
  bookingData,
  setCurrentStep,
  setBookingData,
}: {
  availabilityData: any
  bookingData: any
  setCurrentStep: (step: number) => void
  setBookingData: (bookingData: any) => void
}) {
  // Extract data from props
  const availableRooms = availabilityData.availableRooms || []
  const unavailableRooms = availabilityData.unavailableRooms || []
  const nightsSelected =bookingData.checkIn && bookingData.checkOut? differenceInDays(new Date(bookingData.checkOut), new Date(bookingData.checkIn))
      : 0

  // State for UI interactions
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})
  const [currentImageIndexes, setCurrentImageIndexes] = useState<Record<string, number>>({})
  const [showImageGallery, setShowImageGallery] = useState<string | null>(null)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [dateConflicts, setDateConflicts] = useState<Record<string, boolean>>({})
  const [partialAvailability, setPartialAvailability] = useState<Record<string, string[]>>({})
  const [showDateAdjuster, setShowDateAdjuster] = useState<string | null>(null)
  const [adjustedDates, setAdjustedDates] = useState<{
    checkIn: Date | null
    checkOut: Date | null
  }>({
    checkIn: bookingData.checkIn ? new Date(bookingData.checkIn) : null,
    checkOut: bookingData.checkOut ? new Date(bookingData.checkOut) : null,
  })
  const [dateErrors, setDateErrors] = useState<{
    checkIn?: string
    checkOut?: string
    general?: string
  }>({})
  const [availableDateRanges, setAvailableDateRanges] = useState<Record<string, { start: Date; end: Date }[]>>({})

  // Initialize current image index for each room
  useEffect(() => {
    const initialImageIndexes: Record<string, number> = {}
    availableRooms.forEach((room: any) => {
      initialImageIndexes[room.id] = 0
    })
    setCurrentImageIndexes(initialImageIndexes)
  }, [availableRooms])

  // Check for date conflicts and partial availability
  useEffect(() => {
    if (!bookingData.checkIn || !bookingData.checkOut) return

    const checkInDate = new Date(bookingData.checkIn)
    const checkOutDate = new Date(bookingData.checkOut)

    const conflicts: Record<string, boolean> = {}
    const partial: Record<string, string[]> = {}
    const availableRanges: Record<string, { start: Date; end: Date }[]> = {}

    // Check all rooms (available and unavailable)
    const allRooms = [...availableRooms, ...unavailableRooms]

    allRooms.forEach((room: any) => {
      if (!room.bookedDates || !Array.isArray(room.bookedDates)) {
        conflicts[room.id] = false
        return
      }

      // Find conflicting dates
      const conflictingDates = room.bookedDates.filter((bookedDate: string) => {
        const date = parseISO(bookedDate)
        return isWithinInterval(date, { start: checkInDate, end: checkOutDate })
      })

      conflicts[room.id] = conflictingDates.length > 0

      // If there are conflicts but not for all dates, it's partially available
      if (conflictingDates.length > 0 && conflictingDates.length < nightsSelected) {
        partial[room.id] = conflictingDates

        // Calculate available date ranges
        const sortedBookedDates = [...conflictingDates]
          .map((d) => parseISO(d))
          .sort((a, b) => a.getTime() - b.getTime())

        // Find gaps between booked dates
        const ranges: { start: Date; end: Date }[] = []
        let currentStart = new Date(checkInDate)

        sortedBookedDates.forEach((bookedDate) => {
          if (isBefore(currentStart, bookedDate)) {
            ranges.push({
              start: currentStart,
              end: addDays(bookedDate, -1),
            })
          }
          currentStart = addDays(bookedDate, 1)
        })

        // Add final range if needed
        if (isBefore(currentStart, checkOutDate)) {
          ranges.push({
            start: currentStart,
            end: checkOutDate,
          })
        }

        availableRanges[room.id] = ranges
      }
    })

    setDateConflicts(conflicts)
    setPartialAvailability(partial)
    setAvailableDateRanges(availableRanges)
  }, [availableRooms, unavailableRooms, bookingData.checkIn, bookingData.checkOut, nightsSelected])

  // Toggle room description
  const toggleDescription = (roomId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }))
  }

  // Image navigation
  const nextImage = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const room = [...availableRooms, ...unavailableRooms].find((r: any) => r.id === roomId)
    if (!room || !room.images || room.images.length <= 1) return

    setCurrentImageIndexes((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] + 1) % room.images.length,
    }))
  }

  const prevImage = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const room = [...availableRooms, ...unavailableRooms].find((r: any) => r.id === roomId)
    if (!room || !room.images || room.images.length <= 1) return

    setCurrentImageIndexes((prev) => ({
      ...prev,
      [roomId]: (prev[roomId] - 1 + room.images.length) % room.images.length,
    }))
  }

  // Open image gallery
  const openGallery = (roomId: string) => {
    setShowImageGallery(roomId)
    setGalleryIndex(currentImageIndexes[roomId] || 0)
  }

  // Gallery navigation
  const nextGalleryImage = () => {
    if (!showImageGallery) return
    const room = [...availableRooms, ...unavailableRooms].find((r: any) => r.id === showImageGallery)
    if (!room || !room.images) return

    setGalleryIndex((galleryIndex + 1) % room.images.length)
  }

  const prevGalleryImage = () => {
    if (!showImageGallery) return
    const room = [...availableRooms, ...unavailableRooms].find((r: any) => r.id === showImageGallery)
    if (!room || !room.images) return

    setGalleryIndex((galleryIndex - 1 + room.images.length) % room.images.length)
  }

  // Handle room booking
  const handleBookRoom = (roomId: string) => {
    // Check if there are date conflicts
    if (dateConflicts[roomId]) {
      // If partially available, show date adjuster
      if (partialAvailability[roomId]) {
        // Set initial adjusted dates to the first available range if possible
        if (availableDateRanges[roomId] && availableDateRanges[roomId].length > 0) {
          const firstRange = availableDateRanges[roomId][0]
          setAdjustedDates({
            checkIn: firstRange.start,
            checkOut: firstRange.end,
          })
        }
        setShowDateAdjuster(roomId)
        return
      }

      alert(`This room is not available for the selected dates.`)
      return
    }
    setBookingData({...bookingData, selectedRoom: roomId})
    setCurrentStep(3)
  }

  // Validate adjusted dates
  const validateDates = () => {
    const errors: {
      checkIn?: string
      checkOut?: string
      general?: string
    } = {}

    if (!adjustedDates.checkIn) {
      errors.checkIn = "Check-in date is required"
    }

    if (!adjustedDates.checkOut) {
      errors.checkOut = "Check-out date is required"
    }

    if (adjustedDates.checkIn && adjustedDates.checkOut) {
      if (isBefore(adjustedDates.checkOut, adjustedDates.checkIn)) {
        errors.general = "Check-out date must be after check-in date"
      }

      // Check if the selected dates conflict with booked dates
      if (showDateAdjuster) {
        const bookedDates = partialAvailability[showDateAdjuster] || []
        const hasConflict = bookedDates.some((bookedDate) => {
          const date = parseISO(bookedDate)
          return (
            adjustedDates.checkIn &&
            adjustedDates.checkOut &&
            isWithinInterval(date, {
              start: adjustedDates.checkIn,
              end: adjustedDates.checkOut,
            })
          )
        })

        if (hasConflict) {
          errors.general = "Selected dates conflict with booked dates"
        }
      }
    }

    setDateErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle adjusted date booking
  const handleBookWithAdjustedDates = (roomId: string) => {
    if (!validateDates()) {
      return
    }
    setBookingData({...bookingData, selectedRoom: roomId})
    setShowDateAdjuster(null)
    setCurrentStep(3)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`
  }

  return (
    <div>
      <div className="py-6">
        <h2 className="text-2xl font-semibold text-center text-gray-800">Select Your Room</h2>
      </div>
      <BookingSummary bookingData={bookingData} setCurrentStep={setCurrentStep} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-4 mb-8">
        {availableRooms.map((room: any) => (
          <div
            key={room.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md
              ${bookingData.selectedRoom === room.id ? "ring-2 ring-gray-900" : ""}`}
          >
            {/* Room image */}
            <div className="relative h-64 overflow-hidden p-3">
              {room.images && room.images.length > 0 ? (
                <img
                  src={room.images[currentImageIndexes[room.id] || 0]?.url}
                  alt={room.name}
                  className="w-full rounded-md h-full object-cover transition-transform cursor-pointer"
                  onClick={() => openGallery(room.id)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No image available</div>
              )}

              {/* Image navigation */}
              {room.images && room.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => prevImage(room.id, e)}
                    className=" cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => nextImage(room.id, e)}
                    className=" cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                    {currentImageIndexes[room.id] + 1}/{room.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Room title */}
            <div className="p-5 -mb-6">
              <h3 className="text-xl font-semibold text-gray-800">{room.name}</h3>
            </div>

            {/* Room details */}
            <div className="p-5">
              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <User className="h-5 w-5" />
                <span>Maximum persons: {room.capacity}</span>
              </div>

              {/* Description toggle */}
              <div
                className="flex items-center gap-1 text-gray-700 cursor-pointer mb-3"
                onClick={() => toggleDescription(room.id)}
              >
                {expandedDescriptions[room.id] ? (
                  <>
                    <ChevronUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-5 w-5" />
                    <span className="text-sm font-medium">More</span>
                  </>
                )}
              </div>

              {/* Expanded description */}
              {expandedDescriptions[room.id] && (
                <div className="text-gray-700 mb-4 text-sm leading-relaxed">{room.description}</div>
              )}

              {/* Partial availability info */}
              {dateConflicts[room.id] && partialAvailability[room.id] && !showDateAdjuster && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4 rounded-r-md">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-amber-800">
                        This room is partially available during your selected dates.
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Available periods:
                        {availableDateRanges[room.id]?.map((range, i) => (
                          <span key={i} className="font-medium block mt-0.5">
                            {format(range.start, "MMM d")} - {format(range.end, "MMM d")}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date adjuster */}
              {showDateAdjuster === room.id && (
                <div className="bg-gray-50 p-4 mb-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-800">Adjust your dates</h4>
                    <button
                      onClick={() => setShowDateAdjuster(null)}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {dateErrors.general && (
                    <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-2 rounded-r-md">
                      <p className="text-sm text-red-700">{dateErrors.general}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Check-in date</label>
                      <input
                        type="date"
                        className={`w-full cursor-pointer p-2 border rounded-md ${dateErrors.checkIn ? "border-red-500" : "border-gray-300"}`}
                        value={adjustedDates.checkIn ? format(adjustedDates.checkIn, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            setAdjustedDates((prev) => ({
                              ...prev,
                              checkIn: new Date(e.target.value),
                            }))
                          }
                        }}
                      />
                      {dateErrors.checkIn && <p className="text-xs text-red-600 mt-1">{dateErrors.checkIn}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Check-out date</label>
                      <input
                        type="date"
                        className={`w-full cursor-pointer p-2 border rounded-md ${dateErrors.checkOut ? "border-red-500" : "border-gray-300"}`}
                        value={adjustedDates.checkOut ? format(adjustedDates.checkOut, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            setAdjustedDates((prev) => ({
                              ...prev,
                              checkOut: new Date(e.target.value),
                            }))
                          }
                        }}
                      />
                      {dateErrors.checkOut && <p className="text-xs text-red-600 mt-1">{dateErrors.checkOut}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <p className="text-sm text-gray-600">Available date ranges:</p>
                    {availableDateRanges[room.id]?.map((range, i) => (
                      <button
                        key={i}
                        className="text-left bg-white border border-gray-200 rounded-md p-2 hover:bg-gray-50 flex items-center"
                        onClick={() => {
                          setAdjustedDates({
                            checkIn: range.start,
                            checkOut: range.end,
                          })
                        }}
                      >
                        <Check
                          className={`h-4 w-4 mr-2 ${
                            adjustedDates.checkIn?.getTime() === range.start.getTime() &&
                            adjustedDates.checkOut?.getTime() === range.end.getTime()
                              ? "text-green-500"
                              : "text-gray-300"
                          }`}
                        />
                        <span>
                          {format(range.start, "MMM d")} - {format(range.end, "MMM d")}
                          <span className="text-xs text-gray-500 ml-1">
                            ({differenceInDays(range.end, range.start) + 1}{" "}
                            {differenceInDays(range.end, range.start) + 1 === 1 ? "night" : "nights"})
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      className="bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => handleBookWithAdjustedDates(room.id)}
                    >
                      Book with new dates
                    </button>
                  </div>
                </div>
              )}

              {/* Price and booking */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-sm">From</span>
                  <span className="text-2xl font-semibold text-gray-800">{formatCurrency(room.price)}</span>
                  <span className="text-gray-500 text-xs">per room/nightly</span>
                </div>

                <button
                  className={`py-2 px-6 rounded-lg font-medium transition-colors  cursor-pointer ${
                    dateConflicts[room.id] && !partialAvailability[room.id]
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                  onClick={() => handleBookRoom(room.id)}
                  disabled={dateConflicts[room.id] && !partialAvailability[room.id]}
                >
                  {dateConflicts[room.id] && partialAvailability[room.id] ? "Check availability" : "Show rates"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unavailable Rooms */}
      {unavailableRooms && unavailableRooms.length > 0 && (
        <div className="mx-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Unavailable Rooms</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {unavailableRooms.map((room: any) => (
              <div key={room.id} className="relative bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Unavailable overlay */}
                <div className="absolute inset-0 bg-gray-900/40 z-10 flex items-center justify-center">
                  <div className="bg-white/90 px-4 py-2 rounded-lg text-gray-800 font-medium">Not Available</div>
                </div>

                {/* Room image */}
                <div className="h-64 overflow-hidden bg-gray-200">
                  {room.images && room.images.length > 0 ? (
                    <img
                      src={room.images[0]?.url || "/placeholder.svg"}
                      alt={room.name}
                      className="w-full h-full object-cover filter grayscale"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No image available</div>
                  )}
                </div>

                {/* Room title */}
                <div className="p-5 border-b">
                  <h3 className="text-xl font-semibold text-gray-800">{room.name}</h3>
                </div>

                {/* Room details */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-gray-700 mb-3">
                    <User className="h-5 w-5" />
                    <span>Maximum persons: {room.capacity}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-sm">From</span>
                      <span className="text-2xl font-semibold text-gray-800">{formatCurrency(room.price)}</span>
                      <span className="text-gray-500 text-xs">per room/nightly</span>
                    </div>

                    <button className="bg-gray-200 text-gray-500 py-2 px-6 rounded-lg cursor-not-allowed" disabled>
                      Not available
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            {/* Close button */}
            <button
              onClick={() => setShowImageGallery(null)}
              className="absolute top-4 lg:-right-20  right-2 cursor-pointer  bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Gallery image */}
            <div className="relative h-[70vh] bg-black/30 rounded-lg overflow-hidden">
              {(() => {
                const room = [...availableRooms, ...unavailableRooms].find((r: any) => r.id === showImageGallery)
                if (!room || !room.images || !room.images[galleryIndex]) {
                  return <div className="flex items-center justify-center h-full text-gray-400">No image available</div>
                }

                return (
                  <img
                    src={room.images[galleryIndex].url || "/placeholder.svg"}
                    alt={room.name}
                    className="w-full h-full object-contain"
                  />
                )
              })()}

              {/* Navigation buttons */}
              <button
                onClick={prevGalleryImage}
                className="absolute left-4 cursor-pointer top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextGalleryImage}
                className="absolute right-4 cursor-pointer top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Image counter */}
              {(() => {
                const room = [...availableRooms, ...unavailableRooms].find((r: any) => r.id === showImageGallery)
                if (!room || !room.images) return null

                return (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm">
                    {galleryIndex + 1} / {room.images.length}
                  </div>
                )
              })()}
            </div>

            {/* Thumbnails */}
            {(() => {
              const room = [...availableRooms, ...unavailableRooms].find((r: any) => r.id === showImageGallery)
              if (!room || !room.images || room.images.length <= 1) return null

              return (
                <div className="flex justify-center mt-4 gap-2 overflow-x-auto py-2">
                  {room.images.map((image: any, index: number) => (
                    <div
                      key={image.id}
                      className={`w-16 h-16 rounded-md overflow-hidden cursor-pointer transition-all ${
                        galleryIndex === index ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => setGalleryIndex(index)}
                    >
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt={`${room.name} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
