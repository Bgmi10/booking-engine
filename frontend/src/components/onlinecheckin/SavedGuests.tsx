import React, { useState, useEffect } from "react"
import { User, Mail, MapPin, Calendar, Trash2 } from "lucide-react"
import { baseUrl } from "../../utils/constants"
import toast from 'react-hot-toast'

interface SavedGuest {
  id: string
  relationshipType: string
  canBookFor: boolean
  customer: {
    id: string
    firstName: string
    middleName?: string
    lastName: string
    email: string
    phone?: string
    nationality?: string
    dob?: string
    city?: string
  }
  createdAt: string
}

interface SavedGuestsProps {
  onGuestSelected: (guests: SavedGuest[]) => void
  onClose: () => void
}

export const SavedGuests: React.FC<SavedGuestsProps> = ({
  onGuestSelected,
}) => {
  const [savedGuests, setSavedGuests] = useState<SavedGuest[]>([])
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  // const [isAddingGuests, setIsAddingGuests] = useState(false)

  useEffect(() => {
    fetchSavedGuests()
  }, [])

  const fetchSavedGuests = async () => {
    try {
      const response = await fetch(`${baseUrl}/customers/relationships`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch saved guests')
      }

      const data = await response.json()
      setSavedGuests(data.data || [])
    } catch (error) {
      console.error('Error fetching saved guests:', error)
      toast.error('Failed to load saved guests')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestToggle = (guestId: string) => {
    setSelectedGuests(prev => {
      const newSet = new Set(prev)
      if (newSet.has(guestId)) {
        newSet.delete(guestId)
      } else {
        newSet.add(guestId)
      }
      return newSet
    })
  }

  const handleAddSelectedGuests = () => {
    const guestsToAdd = savedGuests.filter(guest => selectedGuests.has(guest.customer.id))
    onGuestSelected(guestsToAdd)
  }

  const handleRemoveRelationship = async (guestId: string) => {
    try {
      const response = await fetch(`${baseUrl}/customers/relationships/${guestId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to remove relationship')
      }

      // Remove from local state
      setSavedGuests(prev => prev.filter(guest => guest.customer.id !== guestId))
      setSelectedGuests(prev => {
        const newSet = new Set(prev)
        newSet.delete(guestId)
        return newSet
      })

      toast.success('Relationship removed successfully')
    } catch (error) {
      console.error('Error removing relationship:', error)
      toast.error('Failed to remove relationship')
    }
  }

  const formatRelationshipType = (type: string) => {
    return type.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Loading saved guests...
        </div>
      </div>
    )
  }

  if (savedGuests.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No saved guests</h3>
        <p className="text-gray-600 mb-6">
          You haven't saved any guest relationships yet. Add guests manually to save them for future bookings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Your Saved Guests</h3>
        <p className="text-sm text-gray-600">
          Select guests to add to this booking
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {savedGuests.map((guest) => (
          <div
            key={guest.customer.id}
            className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
              selectedGuests.has(guest.customer.id)
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleGuestToggle(guest.customer.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                  selectedGuests.has(guest.customer.id)
                    ? 'border-gray-900 bg-gray-900'
                    : 'border-gray-300'
                }`}>
                  {selectedGuests.has(guest.customer.id) && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {guest.customer.firstName} {guest.customer.middleName} {guest.customer.lastName}
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {formatRelationshipType(guest.relationshipType)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {guest.customer.email && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{guest.customer.email}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {guest.customer.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{guest.customer.city}</span>
                        </div>
                      )}
                      
                      {guest.customer.dob && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(guest.customer.dob)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveRelationship(guest.customer.id)
                }}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors ml-2"
                title="Remove relationship"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* {selectedGuests.size > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {selectedGuests.size} guest{selectedGuests.size !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleAddSelectedGuests}
            disabled={isAddingGuests}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingGuests ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Selected
              </>
            )}
          </button>
        </div>
      )} */}
    </div>
  )
}