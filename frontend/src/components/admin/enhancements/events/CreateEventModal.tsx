import { useState, useEffect } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import toast from "react-hot-toast"
import { baseUrl } from "../../../../utils/constants"
import { useEnhancements } from "../../../../hooks/useEnhancements"
import { useRooms } from "../../../../hooks/useRooms"
import SafariDateTimePicker from "./SafariDateTimePicker"

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const eventTypes = [
  { value: 'PIZZA_NIGHT', label: 'Pizza Night' },
  { value: 'SPECIAL_DINNER', label: 'Special Dinner' },
  { value: 'WINE_TASTING', label: 'Wine Tasting' },
  { value: 'COOKING_CLASS', label: 'Cooking Class' },
  { value: 'ENHANCEMNET', label: 'Enhancement Event' },
  { value: 'OTHERS', label: 'Others' }
]

export default function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  // Fetch only EVENT type enhancements when modal is open
  const { enhancements, loading: enhancementsLoading } = useEnhancements({ enabled: isOpen, type: 'EVENT' })
  // Fetch rooms when modal is open
  const { rooms, loadingRooms, fetchRoomsAndPricing } = useRooms({ showToastOnError: false })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventDate: '',
    eventTime: '',
    eventType: 'PIZZA_NIGHT',
    notes: '',
    enhancements: [] as Array<{
      enhancementId: string
      overridePrice?: number | null
      maxQuantity?: number | null
    }>,
    // Recurring event fields
    isRecurring: false,
    recurrencePattern: 'WEEKLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    recurrenceInterval: 1,
    recurrenceEndType: 'DATE' as 'DATE' | 'COUNT',
    recurrenceEndDate: '',
    recurrenceEndCount: 10,
    weeklyDays: [] as string[],
    monthlyType: 'DATE' as 'DATE' | 'DAY',
    // Event availability rule fields
    createRule: false,
    ruleName: '',
    availabilityType: 'ALWAYS' as 'ALWAYS' | 'WEEKLY' | 'SPECIFIC_DATES',
    availableDays: [] as string[],
    availableTimeStart: '',
    availableTimeEnd: '',
    specificDates: [] as string[],
    roomScope: 'ALL_ROOMS' as 'ALL_ROOMS' | 'SPECIFIC_ROOMS',
    roomIds: [] as string[],
    validFrom: '',
    validUntil: ''
  })
  const [loading, setLoading] = useState(false)

  // Fetch rooms when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRoomsAndPricing()
    }
  }, [isOpen, fetchRoomsAndPricing])

  // Helper function to generate recurring event dates
  const generateRecurringDates = (startDate: Date): Date[] => {
    const dates: Date[] = []
    let currentDate = new Date(startDate)
    let count = 0
    const maxCount = formData.recurrenceEndType === 'COUNT' ? formData.recurrenceEndCount : 100
    const endDate = formData.recurrenceEndType === 'DATE' ? new Date(formData.recurrenceEndDate) : null

    while (count < maxCount && (!endDate || currentDate <= endDate)) {
      // Add current date
      dates.push(new Date(currentDate))
      count++

      // Calculate next date based on pattern
      if (formData.recurrencePattern === 'DAILY') {
        currentDate.setDate(currentDate.getDate() + formData.recurrenceInterval)
      } else if (formData.recurrencePattern === 'WEEKLY') {
        if (formData.weeklyDays.length > 0) {
          // Find next occurrence on selected days
          let foundNext = false
          let daysChecked = 0
          while (!foundNext && daysChecked < 14) { // Prevent infinite loop
            currentDate.setDate(currentDate.getDate() + 1)
            daysChecked++
            const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][currentDate.getDay()]
            if (formData.weeklyDays.includes(dayName)) {
              foundNext = true
            }
          }
        } else {
          // Default to weekly interval if no specific days selected
          currentDate.setDate(currentDate.getDate() + (7 * formData.recurrenceInterval))
        }
      } else if (formData.recurrencePattern === 'MONTHLY') {
        if (formData.monthlyType === 'DATE') {
          currentDate.setMonth(currentDate.getMonth() + formData.recurrenceInterval)
        } else {
          // Same day of week in next month
          const dayOfWeek = currentDate.getDay()
          const weekOfMonth = Math.floor((currentDate.getDate() - 1) / 7)
          currentDate.setMonth(currentDate.getMonth() + formData.recurrenceInterval)
          currentDate.setDate(1)
          // Find the nth occurrence of the day in the month
          while (currentDate.getDay() !== dayOfWeek) {
            currentDate.setDate(currentDate.getDate() + 1)
          }
          currentDate.setDate(currentDate.getDate() + (weekOfMonth * 7))
        }
      }
    }

    return dates
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validation for recurring events
    if (formData.isRecurring) {
      if (formData.recurrencePattern === 'WEEKLY' && formData.weeklyDays.length === 0) {
        toast.error('Please select at least one day for weekly recurrence')
        setLoading(false)
        return
      }
      if (formData.recurrenceEndType === 'DATE' && !formData.recurrenceEndDate) {
        toast.error('Please select an end date for recurrence')
        setLoading(false)
        return
      }
      if (formData.recurrenceEndType === 'COUNT' && formData.recurrenceEndCount < 1) {
        toast.error('Recurrence count must be at least 1')
        setLoading(false)
        return
      }
    }

    // Validation for availability rule if creating one
    if (formData.createRule) {
      if (!formData.ruleName.trim()) {
        toast.error('Rule name is required when creating an availability rule')
        setLoading(false)
        return
      }
      if (formData.availabilityType === 'WEEKLY' && formData.availableDays.length === 0) {
        toast.error('Please select at least one day for weekly availability')
        setLoading(false)
        return
      }
      if (formData.availabilityType === 'SPECIFIC_DATES' && formData.specificDates.length === 0) {
        toast.error('Please add at least one specific date')
        setLoading(false)
        return
      }
      if (formData.roomScope === 'SPECIFIC_ROOMS' && formData.roomIds.length === 0) {
        toast.error('Please select at least one room for specific room scope')
        setLoading(false)
        return
      }
    }

    try {
      // Combine date and time
      const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`)
      
      // Generate dates for recurring events or use single date
      const eventDates = formData.isRecurring ? generateRecurringDates(eventDateTime) : [eventDateTime]
      
      let createdEvents = 0
      let failedEvents = 0

      // Create events for each date
      for (let i = 0; i < eventDates.length; i++) {
        const currentEventDate = eventDates[i]
        const eventName = eventDates.length > 1 ? `${formData.name} #${i + 1}` : formData.name
        
        const payload = {
          name: eventName,
          description: formData.description || null,
          eventDate: currentEventDate.toISOString(),
          eventType: formData.eventType,
          notes: formData.notes || null,
          enhancements: formData.enhancements,
          // Include rule creation data if creating a rule (only for first event in series)
          ...(i === 0 && formData.createRule && {
            createRule: formData.createRule,
            ruleName: formData.ruleName,
            availabilityType: formData.availabilityType,
            availableDays: formData.availableDays,
            availableTimeStart: formData.availableTimeStart,
            availableTimeEnd: formData.availableTimeEnd,
            specificDates: formData.specificDates,
            roomScope: formData.roomScope,
            roomIds: formData.roomIds,
            validFrom: formData.validFrom,
            validUntil: formData.validUntil
          })
        }

        try {
          const res = await fetch(`${baseUrl}/admin/events`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.message || 'Failed to create event')
          }

          createdEvents++

        } catch (eventError) {
          console.error(`Failed to create event ${i + 1}:`, eventError)
          failedEvents++
        }
      }

      // Show appropriate success message
      if (createdEvents > 0) {
        if (failedEvents === 0) {
          toast.success(eventDates.length > 1 ? `${createdEvents} recurring events created successfully` : 'Event created successfully')
        } else {
          toast.success(`${createdEvents} events created, ${failedEvents} failed`)
        }
        onSuccess()
      } else {
        throw new Error('Failed to create any events')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const toggleEnhancement = (enhancementId: string) => {
    setFormData(prev => {
      const exists = prev.enhancements.find(e => e.enhancementId === enhancementId)
      if (exists) {
        return {
          ...prev,
          enhancements: prev.enhancements.filter(e => e.enhancementId !== enhancementId)
        }
      } else {
        return {
          ...prev,
          enhancements: [...prev.enhancements, { enhancementId }]
        }
      }
    })
  }

  const updateEnhancementOverride = (enhancementId: string, field: 'overridePrice' | 'maxQuantity', value: string) => {
    setFormData(prev => ({
      ...prev,
      enhancements: prev.enhancements.map(e => 
        e.enhancementId === enhancementId 
          ? { ...e, [field]: value ? parseFloat(value) : null }
          : e
      )
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm
     bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create New Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RiCloseLine className="text-2xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="e.g., Saturday Pizza Night"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Event description..."
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time - Safari Compatible */}
          <SafariDateTimePicker
            value={{ date: formData.eventDate, time: formData.eventTime }}
            onChange={({ date, time }) => setFormData({ ...formData, eventDate: date, eventTime: time })}
            required={true}
          />

          {/* Recurring Event Options */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                Create recurring events
              </label>
            </div>
            
            {formData.isRecurring && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repeat Pattern
                    </label>
                    <select
                      value={formData.recurrencePattern}
                      onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Every
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.recurrenceInterval}
                        onChange={(e) => setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
                        {formData.recurrencePattern === 'DAILY' ? 'day(s)' : 
                         formData.recurrencePattern === 'WEEKLY' ? 'week(s)' : 'month(s)'}
                      </span>
                    </div>
                  </div>
                </div>

                {formData.recurrencePattern === 'WEEKLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repeat on Days
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => (
                        <label key={day} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.weeklyDays.includes(day)}
                            onChange={() => {
                              const newDays = formData.weeklyDays.includes(day)
                                ? formData.weeklyDays.filter(d => d !== day)
                                : [...formData.weeklyDays, day]
                              setFormData({ ...formData, weeklyDays: newDays })
                            }}
                            className="mr-1"
                          />
                          <span className="text-xs">{day.slice(0, 3)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.recurrencePattern === 'MONTHLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Repeat Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="monthlyType"
                          value="DATE"
                          checked={formData.monthlyType === 'DATE'}
                          onChange={(e) => setFormData({ ...formData, monthlyType: e.target.value as any })}
                          className="mr-2"
                        />
                        <span className="text-sm">On the same date each month</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="monthlyType"
                          value="DAY"
                          checked={formData.monthlyType === 'DAY'}
                          onChange={(e) => setFormData({ ...formData, monthlyType: e.target.value as any })}
                          className="mr-2"
                        />
                        <span className="text-sm">On the same day of the week</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Recurrence
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="recurrenceEndType"
                        value="DATE"
                        checked={formData.recurrenceEndType === 'DATE'}
                        onChange={(e) => setFormData({ ...formData, recurrenceEndType: e.target.value as any })}
                        className="mr-2"
                      />
                      <span className="text-sm mr-3">On date:</span>
                      <input
                        type="date"
                        value={formData.recurrenceEndDate}
                        onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                        disabled={formData.recurrenceEndType !== 'DATE'}
                        className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="recurrenceEndType"
                        value="COUNT"
                        checked={formData.recurrenceEndType === 'COUNT'}
                        onChange={(e) => setFormData({ ...formData, recurrenceEndType: e.target.value as any })}
                        className="mr-2"
                      />
                      <span className="text-sm mr-3">After:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.recurrenceEndCount}
                        onChange={(e) => setFormData({ ...formData, recurrenceEndCount: parseInt(e.target.value) || 10 })}
                        disabled={formData.recurrenceEndType !== 'COUNT'}
                        className="w-20 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <span className="text-sm ml-2">occurrences</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Available Enhancements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Enhancements
            </label>
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto p-3">
              {enhancementsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <BiLoader className="animate-spin text-gray-500 mr-2" />
                  <span className="text-gray-500 text-sm">Loading enhancements...</span>
                </div>
              ) : enhancements.length === 0 ? (
                <p className="text-gray-500 text-sm">No enhancements available</p>
              ) : (
                <div className="space-y-3">
                  {enhancements.map(enhancement => {
                    const selected = formData.enhancements.find(e => e.enhancementId === enhancement.id)
                    return (
                      <div
                        key={enhancement.id}
                        className={`p-3 rounded-lg border ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <label className="flex items-start cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleEnhancement(enhancement.id)}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{enhancement.name}</div>
                            <div className="text-xs text-gray-500">
                              Default: €{enhancement.price} - {enhancement.pricingType}
                            </div>
                          </div>
                        </label>
                        {selected && (
                          <div className="mt-3 ml-6 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Override Price (optional)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={enhancement.price.toString()}
                                value={selected.overridePrice || ''}
                                onChange={(e) => updateEnhancementOverride(enhancement.id, 'overridePrice', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Max Quantity (optional)</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="Unlimited"
                                value={selected.maxQuantity || ''}
                                onChange={(e) => updateEnhancementOverride(enhancement.id, 'maxQuantity', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Event Availability Rules */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="createRule"
                checked={formData.createRule}
                onChange={(e) => setFormData({ ...formData, createRule: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="createRule" className="text-sm font-medium text-gray-700">
                Create availability rule for this event
              </label>
            </div>
            
            {formData.createRule && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ruleName}
                    onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Pizza Night Availability"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability Type
                  </label>
                  <select
                    value={formData.availabilityType}
                    onChange={(e) => setFormData({ ...formData, availabilityType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALWAYS">Always Available</option>
                    <option value="WEEKLY">Weekly Schedule</option>
                    <option value="SPECIFIC_DATES">Specific Dates</option>
                  </select>
                </div>

                {formData.availabilityType === 'WEEKLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Days
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => (
                        <label key={day} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.availableDays.includes(day)}
                            onChange={() => {
                              const newDays = formData.availableDays.includes(day)
                                ? formData.availableDays.filter(d => d !== day)
                                : [...formData.availableDays, day]
                              setFormData({ ...formData, availableDays: newDays })
                            }}
                            className="mr-1"
                          />
                          <span className="text-xs">{day.slice(0, 3)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.availabilityType === 'SPECIFIC_DATES' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specific Dates
                    </label>
                    <input
                      type="date"
                      onChange={(e) => {
                        if (e.target.value && !formData.specificDates.includes(e.target.value)) {
                          setFormData({ 
                            ...formData, 
                            specificDates: [...formData.specificDates, e.target.value] 
                          })
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.specificDates.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {formData.specificDates.map((date, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                            <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  specificDates: formData.specificDates.filter((_, i) => i !== index)
                                })
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time (optional)
                    </label>
                    <input
                      type="time"
                      value={formData.availableTimeStart}
                      onChange={(e) => setFormData({ ...formData, availableTimeStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time (optional)
                    </label>
                    <input
                      type="time"
                      value={formData.availableTimeEnd}
                      onChange={(e) => setFormData({ ...formData, availableTimeEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Scope
                  </label>
                  <select
                    value={formData.roomScope}
                    onChange={(e) => setFormData({ ...formData, roomScope: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL_ROOMS">All Rooms</option>
                    <option value="SPECIFIC_ROOMS">Specific Rooms</option>
                  </select>
                </div>

                {formData.roomScope === 'SPECIFIC_ROOMS' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Rooms
                    </label>
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-3">
                      {loadingRooms ? (
                        <div className="flex items-center justify-center py-4">
                          <BiLoader className="animate-spin text-gray-500 mr-2" />
                          <span className="text-gray-500 text-sm">Loading rooms...</span>
                        </div>
                      ) : rooms.length === 0 ? (
                        <p className="text-gray-500 text-sm">No rooms available</p>
                      ) : (
                        <div className="space-y-2">
                          {rooms.map(room => (
                            <label key={room.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.roomIds.includes(room.id)}
                                onChange={() => {
                                  const newRoomIds = formData.roomIds.includes(room.id)
                                    ? formData.roomIds.filter(id => id !== room.id)
                                    : [...formData.roomIds, room.id]
                                  setFormData({ ...formData, roomIds: newRoomIds })
                                }}
                                className="mr-3"
                              />
                              <span className="text-sm">{room.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid From (optional)
                    </label>
                    <DatePicker
                      selected={formData.validFrom ? new Date(formData.validFrom) : null}
                      onChange={(date: Date | null) => setFormData({ ...formData, validFrom: date ? date.toISOString().split('T')[0] : '' })}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholderText="dd/mm/yyyy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid Until (optional)
                    </label>
                    <DatePicker
                      selected={formData.validUntil ? new Date(formData.validUntil) : null}
                      onChange={(date: Date | null) => setFormData({ ...formData, validUntil: date ? date.toISOString().split('T')[0] : '' })}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholderText="dd/mm/yyyy"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Internal notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.eventDate || !formData.eventTime}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <BiLoader className="animate-spin" />}
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}