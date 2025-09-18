import { useState, useEffect } from "react"
import { RiCloseLine, RiCalendarLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import toast from "react-hot-toast"
import { baseUrl } from "../../../../utils/constants"
import { useEnhancements } from "../../../../hooks/useEnhancements"
import type { Event } from "../../../../types/types"

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
  // Fetch enhancements only when modal is open
  const { enhancements, loading: enhancementsLoading } = useEnhancements({ enabled: isOpen })
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
    }>
  })
  const [loading, setLoading] = useState(false)

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
        })) || []
      })
    }
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
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
        enhancements: formData.enhancements
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

      toast.success('Event updated successfully')
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <RiCalendarLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.eventTime}
                onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
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