import { useState } from "react"
import { RiCloseLine, RiCalendarLine, RiGroupLine, RiMoneyEuroCircleLine, RiMailLine, RiUserAddLine } from "react-icons/ri"
import type { Event } from "../../../../types/types"
import ManageParticipantsModal from "./ManageParticipantsModal"

interface ViewEventModalProps {
  isOpen: boolean
  event: Event & {
    provisional?: {
      plannedAttendees: number;
      notes?: string;
      registryStatus: string;
    };
  }
  onClose: () => void
  onUpdate?: () => void
}

export default function ViewEventModal({ isOpen, event, onClose, onUpdate }: ViewEventModalProps) {
  const [showParticipantModal, setShowParticipantModal] = useState(false)
  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'PIZZA_NIGHT':
        return 'bg-orange-100 text-orange-800'
      case 'SPECIAL_DINNER':
        return 'bg-purple-100 text-purple-800'
      case 'WINE_TASTING':
        return 'bg-pink-100 text-pink-800'
      case 'COOKING_CLASS':
        return 'bg-yellow-100 text-yellow-800'
      case 'ENHANCEMNET':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div> 
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Event Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RiCloseLine className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Event Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <p className="font-medium">{event.name}</p>
                </div>
                {event.description && (
                  <div>
                    <label className="text-sm text-gray-600">Description</label>
                    <p className="text-gray-900">{event.description}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600">Type</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(event.eventType)}`}>
                    {event.eventType.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Schedule & Capacity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RiCalendarLine className="text-gray-400" />
                  <div>
                    <label className="text-sm text-gray-600">Date & Time</label>
                    <p className="font-medium">{formatDate(event.eventDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RiGroupLine className="text-gray-400" />
                  <div>
                    <label className="text-sm text-gray-600">Participants</label>
                    <p className="font-medium">
                      {event.totalGuests}
                      {event.maxCapacity && (
                        <span className="text-gray-500"> / {event.maxCapacity} capacity</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RiMoneyEuroCircleLine className="text-gray-400" />
                  <div>
                    <label className="text-sm text-gray-600">Total Revenue</label>
                    <p className="font-medium text-green-600">€{event.totalRevenue?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Provisional Registry Info */}
          {event.provisional && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-yellow-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Pre-Registration Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700">Planned Attendees:</span>
                  <span className="font-semibold text-yellow-800">{event.provisional.plannedAttendees} guests</span>
                </div>
                {event.provisional.notes && (
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-yellow-700">Notes:</span>
                    <span className="text-sm text-yellow-800 text-right ml-2">{event.provisional.notes}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-700">Registry Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                    {event.provisional.registryStatus}
                  </span>
                </div>
                <p className="text-xs text-yellow-600 mt-2 italic">
                  These guests have indicated interest during booking but haven't confirmed participation yet.
                </p>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Event Statistics</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <RiMailLine className="text-2xl text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{event._count?.eventInvitations || 0}</div>
                <div className="text-sm text-gray-600">Invitations Sent</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <RiMoneyEuroCircleLine className="text-2xl text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">€{event.totalRevenue?.toFixed(0) || '0'}</div>
                <div className="text-sm text-gray-600">Revenue</div>  
              </div>
            </div>
            
            {/* Participant Status Breakdown */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Participant Status</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {event.eventParticipants?.filter(p => p.status === 'COMPLETED').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Attended</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {event.eventParticipants?.filter(p => p.status === 'CANCELLED' || p.status === 'DECLINED').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Cancelled/Declined</div>
                </div>  
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {event.eventParticipants?.filter(p => p.status === 'PENDING').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Not Attended Yet</div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Enhancements */}
          {event.eventEnhancements && event.eventEnhancements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Enhancements</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enhancement</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {event.eventEnhancements.map(ee => (
                      <tr key={ee.id}>
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{ee.enhancement.name}</div>
                            <div className="text-sm text-gray-500">{ee.enhancement.description}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          €{ee.overridePrice || ee.enhancement.price}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {ee.enhancement.pricingType}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {ee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manage Participants Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowParticipantModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
            >
              <RiUserAddLine className="text-xl" />
              Manage Participants
            </button>
          </div>

          {/* Timestamps */}
          <div className="border-t pt-4 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Created: {formatDate(event.createdAt)}</span>
              <span>Last Updated: {formatDate(event.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    
    
    <ManageParticipantsModal
      isOpen={showParticipantModal}
      event={event}
      onClose={() => setShowParticipantModal(false)}
      onUpdate={() => {
        setShowParticipantModal(false);
        if (onUpdate) onUpdate();
      }}
    />
    </div>
  )
}