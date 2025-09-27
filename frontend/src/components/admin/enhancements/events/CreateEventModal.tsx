import { useState } from "react"
import { RiCloseLine } from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import toast from "react-hot-toast"
import { baseUrl } from "../../../../utils/constants"
import { useEnhancements } from "../../../../hooks/useEnhancements"
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
    }>
  })
  const [loading, setLoading] = useState(false)

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
        notes: formData.notes || null,
        enhancements: formData.enhancements
      }

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

      toast.success('Event created successfully')
      onSuccess()
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
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