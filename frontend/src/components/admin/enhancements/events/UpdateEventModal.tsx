import { useState, useEffect } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import toast from "react-hot-toast"
import { baseUrl } from "../../../../utils/constants"
import { useEnhancements } from "../../../../hooks/useEnhancements"
import { useRooms } from "../../../../hooks/useRooms"
import type { Event } from "../../../../types/types"
import SafariDateTimePicker from "./SafariDateTimePicker"

interface UpdateEventModalProps {
  isOpen: boolean
  event: Event
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

const eventStatuses = [
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
]

export default function UpdateEventModal({ isOpen, event, onClose, onSuccess }: UpdateEventModalProps) {
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
    status: 'IN_PROGRESS',
    reason: '',
    notes: '',
    enhancements: [] as Array<{
      enhancementId: string
      overridePrice?: number | null
      maxQuantity?: number | null
    }>,
    // Event availability rule fields (for creating new rules)
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
  
  // State for managing existing rules editing
  const [editingRules, setEditingRules] = useState<{[ruleId: string]: any}>({})
  const [loading, setLoading] = useState(false)

  // Fetch rooms when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRoomsAndPricing()
    }
  }, [isOpen, fetchRoomsAndPricing])

  useEffect(() => {
    if (event) {
      const eventDateTime = new Date(event.eventDate)
      setFormData({
        name: event.name,
        description: event.description || '',
        eventDate: eventDateTime.toISOString().split('T')[0],
        eventTime: eventDateTime.toTimeString().slice(0, 5),
        eventType: event.eventType,
        status: event.status,
        reason: '',
        notes: '',
        enhancements: event.eventEnhancements?.map(ee => ({
          enhancementId: ee.enhancementId,
          overridePrice: ee.overridePrice,
          maxQuantity: ee.maxQuantity
        })) || [],
        // Reset rule form fields
        createRule: false,
        ruleName: '',
        availabilityType: 'ALWAYS',
        availableDays: [],
        availableTimeStart: '',
        availableTimeEnd: '',
        specificDates: [],
        roomScope: 'ALL_ROOMS',
        roomIds: [],
        validFrom: '',
        validUntil: ''
      })
      
      // Initialize editing rules state
      const initialEditingRules: {[ruleId: string]: any} = {}
      event.eventEnhancements?.forEach(ee => {
        ee.enhancement?.enhancementRules?.forEach(rule => {
          initialEditingRules[rule.id] = {
            name: rule.name,
            availabilityType: rule.availabilityType,
            availableDays: rule.availableDays || [],
            availableTimeStart: rule.availableTimeStart || '',
            availableTimeEnd: rule.availableTimeEnd || '',
            roomScope: rule.roomScope,
            roomIds: rule.roomIds || [],
            isActive: rule.isActive,
            validFrom: rule.validFrom ? new Date(rule.validFrom).toISOString().split('T')[0] : '',
            validUntil: rule.validUntil ? new Date(rule.validUntil).toISOString().split('T')[0] : ''
          }
        })
      })
      setEditingRules(initialEditingRules)
    }
  }, [event])

  // Helper function to update editing rule state
  const updateEditingRule = (ruleId: string, updates: Partial<any>) => {
    setEditingRules(prev => ({
      ...prev,
      [ruleId]: {
        ...prev[ruleId],
        ...updates
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation for availability rule creation
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

      // Combine date and time
      const eventDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`)
      
      const payload = {
        name: formData.name,
        description: formData.description || null,
        eventDate: eventDateTime.toISOString(),
        eventType: formData.eventType,
        status: formData.status,
        reason: formData.reason,
        notes: formData.notes || null,
        enhancements: formData.enhancements,
        // Include rule creation data if creating a rule
        ...(formData.createRule && {
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

      const res = await fetch(`${baseUrl}/admin/events/${event.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to update event')
      }

      // Success message based on whether rule was created
      if (formData.createRule) {
        toast.success('Event updated and availability rule created successfully')
      } else {
        toast.success('Event updated successfully')
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update event')
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
          ? { ...e, [field]: value ? (field === 'maxQuantity' ? parseInt(value) : parseFloat(value)) : null }
          : e
      )
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Update Event</h2>
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
            />
          </div>

          {/* Event Type and Status */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {eventStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time - Safari Compatible */}
          <SafariDateTimePicker
            value={{ date: formData.eventDate, time: formData.eventTime }}
            onChange={({ date, time }) => setFormData({ ...formData, eventDate: date, eventTime: time })}
            required={true}
          />

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

          {/* Existing Enhancement Rules - Editable */}
          {event?.eventEnhancements && event.eventEnhancements.some(ee => ee.enhancement?.enhancementRules && ee.enhancement.enhancementRules.length > 0) && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Existing Availability Rules</h3>
              <div className="space-y-4">
                {event.eventEnhancements.map(eventEnhancement => 
                  eventEnhancement.enhancement?.enhancementRules?.map((rule) => (
                    <div key={rule.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm text-gray-900">Edit Rule: {rule.name}</h4>
                          <span className="text-xs text-gray-600">Enhancement: {eventEnhancement.enhancement.name}</span>
                        </div>
                        
                        {/* Rule Name */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Rule Name
                          </label>
                          <input
                            type="text"
                            value={editingRules[rule.id]?.name || rule.name}
                            onChange={(e) => updateEditingRule(rule.id, { name: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Availability Type */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Availability Type
                          </label>
                          <select
                            value={editingRules[rule.id]?.availabilityType || rule.availabilityType}
                            onChange={(e) => updateEditingRule(rule.id, { availabilityType: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="ALWAYS">Always Available</option>
                            <option value="WEEKLY">Weekly Schedule</option>
                            <option value="SPECIFIC_DATES">Specific Dates</option>
                            <option value="SEASONAL">Seasonal</option>
                          </select>
                        </div>

                        {/* Weekly Days - Show if type is WEEKLY */}
                        {(editingRules[rule.id]?.availabilityType || rule.availabilityType) === 'WEEKLY' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Available Days
                            </label>
                            <div className="grid grid-cols-7 gap-1">
                              {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => (
                                <label key={day} className="flex items-center text-xs">
                                  <input
                                    type="checkbox"
                                    checked={(editingRules[rule.id]?.availableDays || rule.availableDays || []).includes(day)}
                                    onChange={(e) => {
                                      const currentDays = editingRules[rule.id]?.availableDays || rule.availableDays || []
                                      if (e.target.checked) {
                                        updateEditingRule(rule.id, { 
                                          availableDays: [...currentDays.filter((d: string) => d !== day), day] 
                                        })
                                      } else {
                                        updateEditingRule(rule.id, { 
                                          availableDays: currentDays.filter((d: string) => d !== day) 
                                        })
                                      }
                                    }}
                                    className="mr-1"
                                  />
                                  <span>{day.slice(0, 3)}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={editingRules[rule.id]?.availableTimeStart ?? rule.availableTimeStart ?? ''}
                              onChange={(e) => updateEditingRule(rule.id, { availableTimeStart: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={editingRules[rule.id]?.availableTimeEnd ?? rule.availableTimeEnd ?? ''}
                              onChange={(e) => updateEditingRule(rule.id, { availableTimeEnd: e.target.value })}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Room Scope */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Room Scope
                          </label>
                          <select
                            value={editingRules[rule.id]?.roomScope || rule.roomScope}
                            onChange={(e) => updateEditingRule(rule.id, { 
                              roomScope: e.target.value,
                              // Clear room selection when switching to ALL_ROOMS
                              roomIds: e.target.value === 'ALL_ROOMS' ? [] : (editingRules[rule.id]?.roomIds || rule.roomIds || [])
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="ALL_ROOMS">All Rooms</option>
                            <option value="SPECIFIC_ROOMS">Specific Rooms</option>
                          </select>
                        </div>

                        {/* Specific Rooms - Show if scope is SPECIFIC_ROOMS */}
                        {(editingRules[rule.id]?.roomScope || rule.roomScope) === 'SPECIFIC_ROOMS' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Select Rooms
                            </label>
                            <div className="border border-gray-300 rounded max-h-32 overflow-y-auto p-2">
                              {loadingRooms ? (
                                <div className="flex items-center justify-center py-2">
                                  <BiLoader className="animate-spin text-gray-500 mr-1" />
                                  <span className="text-xs text-gray-500">Loading rooms...</span>
                                </div>
                              ) : rooms.length === 0 ? (
                                <p className="text-xs text-gray-500">No rooms available</p>
                              ) : (
                                <div className="space-y-1">
                                  {rooms.map(room => (
                                    <label key={room.id} className="flex items-center text-xs">
                                      <input
                                        type="checkbox"
                                        checked={(editingRules[rule.id]?.roomIds || rule.roomIds || []).includes(room.id)}
                                        onChange={(e) => {
                                          const currentRoomIds = editingRules[rule.id]?.roomIds || rule.roomIds || []
                                          if (e.target.checked) {
                                            updateEditingRule(rule.id, { 
                                              roomIds: [...currentRoomIds.filter((id: string) => id !== room.id), room.id] 
                                            })
                                          } else {
                                            updateEditingRule(rule.id, { 
                                              roomIds: currentRoomIds.filter((id: string) => id !== room.id) 
                                            })
                                          }
                                        }}
                                        className="mr-2"
                                      />
                                      <span>{room.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Validity Period */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Valid From
                            </label>
                            <DatePicker
                              selected={editingRules[rule.id]?.validFrom ? new Date(editingRules[rule.id].validFrom) : (rule.validFrom ? new Date(rule.validFrom) : null)}
                              onChange={(date: Date | null) => updateEditingRule(rule.id, { validFrom: date ? date.toISOString().split('T')[0] : '' })}
                              dateFormat="dd/MM/yyyy"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholderText="dd/mm/yyyy"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Valid Until
                            </label>
                            <DatePicker
                              selected={editingRules[rule.id]?.validUntil ? new Date(editingRules[rule.id].validUntil) : (rule.validUntil ? new Date(rule.validUntil) : null)}
                              onChange={(date: Date | null) => updateEditingRule(rule.id, { validUntil: date ? date.toISOString().split('T')[0] : '' })}
                              dateFormat="dd/MM/yyyy"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholderText="dd/mm/yyyy"
                            />
                          </div>
                        </div>

                        {/* Active Status */}
                        <div>
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={editingRules[rule.id]?.isActive ?? rule.isActive}
                              onChange={(e) => updateEditingRule(rule.id, { isActive: e.target.checked })}
                              className="mr-2"
                            />
                            <span className="font-medium text-gray-700">Active Rule</span>
                          </label>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={async () => {
                              // Save changes to this specific rule
                              try {
                                const ruleData = editingRules[rule.id] || {
                                  name: rule.name,
                                  availabilityType: rule.availabilityType,
                                  availableDays: rule.availableDays || [],
                                  availableTimeStart: rule.availableTimeStart,
                                  availableTimeEnd: rule.availableTimeEnd,
                                  roomScope: rule.roomScope,
                                  roomIds: rule.roomIds || [],
                                  isActive: rule.isActive,
                                  validFrom: rule.validFrom,
                                  validUntil: rule.validUntil
                                }
                                
                                const response = await fetch(`${baseUrl}/admin/enhancement-rules/${rule.id}`, {
                                  method: 'PUT',
                                  credentials: 'include',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(ruleData),
                                });
                                
                                if (response.ok) {
                                  toast.success('Rule updated successfully');
                                } else {
                                  throw new Error('Failed to update rule');
                                }
                              } catch (error) {
                                toast.error('Failed to update rule');
                                console.error('Rule update error:', error);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this rule?')) {
                                try {
                                  const response = await fetch(`${baseUrl}/admin/enhancement-rules/${rule.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  });
                                  
                                  if (response.ok) {
                                    toast.success('Rule deleted successfully');
                                    // Remove the rule from editing state
                                    setEditingRules(prev => {
                                      const newState = { ...prev };
                                      delete newState[rule.id];
                                      return newState;
                                    });
                                    // Call onSuccess to refresh the event data from parent
                                    onSuccess();
                                  } else {
                                    throw new Error('Failed to delete rule');
                                  }
                                } catch (error) {
                                  toast.error('Failed to delete rule');
                                  console.error('Rule deletion error:', error);
                                }
                              }
                            }}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
                Create additional availability rule for this event
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
                    placeholder="e.g., Additional Pizza Night Rule"
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

          {/* Reason for Update - REQUIRED */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Update <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Please provide a reason for this update..."
              required
            />
          </div>

          {/* Update Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Internal notes..."
            />
          </div>

          {/* Event Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Event Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Participants:</span>
                <span className="ml-2 font-medium">{event.totalGuests}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Revenue:</span>
                <span className="ml-2 font-medium">€{event.totalRevenue?.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Invitations Sent:</span>
                <span className="ml-2 font-medium">{event._count?.eventInvitations || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Participants:</span>
                <span className="ml-2 font-medium">{event._count?.eventParticipants || 0}</span>
              </div>
            </div>
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
              disabled={loading || !formData.name || !formData.eventDate || !formData.eventTime || !formData.reason}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <BiLoader className="animate-spin" />}
              Update Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}