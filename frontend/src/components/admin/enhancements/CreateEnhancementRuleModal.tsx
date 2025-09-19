import { useState, useEffect } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { baseUrl } from "../../../utils/constants"
import type { Enhancement, Room } from "../../../types/types"
import toast from "react-hot-toast"

interface CreateEnhancementRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  enhancementId: string | null
}

export default function CreateEnhancementRuleModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  enhancementId 
}: CreateEnhancementRuleModalProps) {
  // Form states
  const [name, setName] = useState("")
  const [selectedEnhancementId, setSelectedEnhancementId] = useState(enhancementId || "")
  const [availabilityType, setAvailabilityType] = useState<"ALWAYS" | "WEEKLY" | "SPECIFIC_DATES" | "SEASONAL">("ALWAYS")
  const [availableDays, setAvailableDays] = useState<string[]>([])
  const [availableTimeStart, setAvailableTimeStart] = useState("")
  const [availableTimeEnd, setAvailableTimeEnd] = useState("")
  const [specificDates, setSpecificDates] = useState<string[]>([])
  const [seasonStart, setSeasonStart] = useState<Date | null>(null)
  const [seasonEnd, setSeasonEnd] = useState<Date | null>(null)
  const [validFrom, setValidFrom] = useState<Date | null>(null)
  const [validUntil, setValidUntil] = useState<Date | null>(null)
  const [roomScope, setRoomScope] = useState<"ALL_ROOMS" | "SPECIFIC_ROOMS">("ALL_ROOMS")
  const [roomIds, setRoomIds] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [enhancements, setEnhancements] = useState<Enhancement[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  // Fetch enhancements and rooms
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      // Fetch enhancements
      const enhancementsRes = await fetch(`${baseUrl}/admin/enhancements/all`, {
        credentials: "include",
      })
      if (enhancementsRes.ok) {
        const enhancementsData = await enhancementsRes.json()
        setEnhancements(enhancementsData.data || [])
      }

      // Fetch rooms
      const roomsRes = await fetch(`${baseUrl}/admin/rooms/all`, {
        credentials: "include",
      })
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json()
        setRooms(roomsData.data || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setName("")
    setSelectedEnhancementId(enhancementId || "")
    setAvailabilityType("ALWAYS")
    setAvailableDays([])
    setAvailableTimeStart("")
    setAvailableTimeEnd("")
    setSpecificDates([])
    setSeasonStart(null)
    setSeasonEnd(null)
    setValidFrom(null)
    setValidUntil(null)
    setRoomScope("ALL_ROOMS")
    setRoomIds([])
    setIsActive(true)
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const handleDayToggle = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day))
    } else {
      setAvailableDays([...availableDays, day])
    }
  }

  const handleRoomToggle = (roomId: string) => {
    if (roomIds.includes(roomId)) {
      setRoomIds(roomIds.filter(id => id !== roomId))
    } else {
      setRoomIds([...roomIds, roomId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Validation
    if (!name.trim()) {
      toast.error("Rule name is required")
      return
    }

    if (!selectedEnhancementId) {
      toast.error("Please select an enhancement")
      return
    }

    if (availabilityType === "WEEKLY" && availableDays.length === 0) {
      toast.error("Please select at least one day for weekly availability")
      return
    }

    if (availabilityType === "SPECIFIC_DATES" && specificDates.length === 0) {
      toast.error("Please add at least one specific date")
      return
    }

    if (availabilityType === "SEASONAL" && (!seasonStart || !seasonEnd)) {
      toast.error("Season start and end dates are required for seasonal availability")
      return
    }

    if (roomScope === "SPECIFIC_ROOMS" && roomIds.length === 0) {
      toast.error("Please select at least one room")
      return
    }

    setLoading(true)

    try {
      const requestBody: any = {
        name: name.trim(),
        enhancementId: selectedEnhancementId,
        availabilityType,
        roomScope,
        isActive,
        availableDays: availabilityType === "WEEKLY" ? availableDays : [],
        roomIds: roomScope === "SPECIFIC_ROOMS" ? roomIds : [],
      }

      // Add optional fields
      if (availableTimeStart) requestBody.availableTimeStart = availableTimeStart
      if (availableTimeEnd) requestBody.availableTimeEnd = availableTimeEnd
      if (validFrom) requestBody.validFrom = validFrom.toISOString()
      if (validUntil) requestBody.validUntil = validUntil.toISOString()

      if (availabilityType === "SPECIFIC_DATES") {
        requestBody.specificDates = specificDates.map(date => new Date(date).toISOString())
      }

      if (availabilityType === "SEASONAL") {
        requestBody.seasonal = true
        //@ts-ignore
        requestBody.seasonStart = seasonStart.toISOString()
        //@ts-ignore
        requestBody.seasonEnd = seasonEnd.toISOString()
      }

      const res = await fetch(`${baseUrl}/admin/enhancement-rules`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to create rule")
      }

      toast.success("Rule created successfully!")
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Failed to create rule")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Create Enhancement Rule</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">

          {loadingData ? (
            <div className="flex justify-center items-center py-8">
              <BiLoader className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 p-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="e.g., Weekend Special"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Enhancement *
                    </label>
                    <select
                      value={selectedEnhancementId}
                      onChange={(e) => setSelectedEnhancementId(e.target.value)}
                      className="mt-1 p-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select an enhancement</option>
                      {enhancements.map((enhancement) => (
                        <option key={enhancement.id} value={enhancement.id}>
                          {enhancement.name} - €{enhancement.price}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Availability Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Availability Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Availability Type *
                    </label>
                    <select
                      value={availabilityType}
                      onChange={(e) => setAvailabilityType(e.target.value as any)}
                      className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="ALWAYS">Always Available</option>
                      <option value="WEEKLY">Weekly Schedule</option>
                      <option value="SPECIFIC_DATES">Specific Dates</option>
                      <option value="SEASONAL">Seasonal</option>
                    </select>
                  </div>

                  {availabilityType === "WEEKLY" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Days
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {daysOfWeek.map((day) => (
                          <label key={day} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={availableDays.includes(day)}
                              onChange={() => handleDayToggle(day)}
                              className="p-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              {day.charAt(0) + day.slice(1).toLowerCase()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {availabilityType === "SPECIFIC_DATES" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Specific Dates
                      </label>
                      <DatePicker
                        selected={null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            const dateStr = date.toISOString().split('T')[0]
                            if (!specificDates.includes(dateStr)) {
                              setSpecificDates([...specificDates, dateStr])
                            }
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholderText="Select a date"
                      />
                      {specificDates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {specificDates.map((date) => (
                            <span
                              key={date}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              <button
                                type="button"
                                onClick={() => setSpecificDates(specificDates.filter(d => d !== date))}
                                className="ml-1 text-indigo-600 hover:text-indigo-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {availabilityType === "SEASONAL" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Season Start *
                        </label>
                        <DatePicker
                          selected={seasonStart}
                          onChange={(date: Date | null) => setSeasonStart(date)}
                          dateFormat="dd/MM/yyyy"
                          className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholderText="dd/mm/yyyy"
                          required={availabilityType === "SEASONAL"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Season End *
                        </label>
                        <DatePicker
                          selected={seasonEnd}
                          onChange={(date: Date | null) => setSeasonEnd(date)}
                          dateFormat="dd/MM/yyyy"
                          className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholderText="dd/mm/yyyy"
                          required={availabilityType === "SEASONAL"}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Available From Time
                      </label>
                      <input
                        type="time"
                        value={availableTimeStart}
                        onChange={(e) => setAvailableTimeStart(e.target.value)}
                        className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Available Until Time
                      </label>
                      <input
                        type="time"
                        value={availableTimeEnd}
                        onChange={(e) => setAvailableTimeEnd(e.target.value)}
                        className="mt-1 p-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Validity Period */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Validity Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valid From
                    </label>
                    <DatePicker
                      selected={validFrom}
                      onChange={(date: Date | null) => setValidFrom(date)}
                      dateFormat="dd/MM/yyyy"
                      className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholderText="dd/mm/yyyy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valid Until
                    </label>
                    <DatePicker
                      selected={validUntil}
                      onChange={(date: Date | null) => setValidUntil(date)}
                      dateFormat="dd/MM/yyyy"
                      className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholderText="dd/mm/yyyy"
                    />
                  </div>
                </div>
              </div>

              {/* Room Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Room Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Room Scope *
                    </label>
                    <select
                      value={roomScope}
                      onChange={(e) => setRoomScope(e.target.value as any)}
                      className="p-3 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="ALL_ROOMS">All Rooms</option>
                      <option value="SPECIFIC_ROOMS">Specific Rooms</option>
                    </select>
                  </div>

                  {roomScope === "SPECIFIC_ROOMS" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Rooms
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                        {rooms.map((room) => (
                          <label key={room.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={roomIds.includes(room.id)}
                              onChange={() => handleRoomToggle(room.id)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{room.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingData}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <BiLoader className="animate-spin mr-2" />
                  Creating...
                </span>
              ) : (
                "Create Rule"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}