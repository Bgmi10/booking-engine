import { useEffect, useState } from "react"
import { 
  RiAddLine, 
  RiRefreshLine, 
  RiSearchLine,
  RiDeleteBin6Line,
  RiEyeLine,
  RiEdit2Line,
  RiCalendarEventLine,
  RiMailSendLine
} from "react-icons/ri"
import { BiLoader } from "react-icons/bi"
import toast from "react-hot-toast"
import { baseUrl } from "../../../../utils/constants"
import CreateEventModal from "./CreateEventModal"
import UpdateEventModal from "./UpdateEventModal"
import ViewEventModal from "./ViewEventModal"
import EventAuditLogModal from "./EventAuditLogModal"
import type { Event } from "../../../../types/types"
import { History } from "lucide-react"

export default function Events() {
  // States
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loadingAction, setLoadingAction] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  // Modal states
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false)
  const [isUpdateEventModalOpen, setIsUpdateEventModalOpen] = useState(false)
  const [isViewEventModalOpen, setIsViewEventModalOpen] = useState(false)
  const [isDeleteEventModalOpen, setIsDeleteEventModalOpen] = useState(false)
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false)
  const [sendingInvites, setSendingInvites] = useState<string | null>(null)

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/admin/events`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to fetch events")
      }
      
      const data = await res.json()
      setEvents(data.data || [])
      setFilteredEvents(data.data || [])
    } catch (error) {
      console.error(error)
      toast.error("Failed to load events. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Delete event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    
    setLoadingAction(true)
    
    try {
      const res = await fetch(`${baseUrl}/admin/events/${selectedEvent.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete event")
      }
      
      toast.success("Event deleted successfully")
      setIsDeleteEventModalOpen(false)
      fetchEvents()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event")
    } finally {
      setLoadingAction(false)
    }
  }

  // Send event invitations
  const handleSendInvitations = async (eventId: string) => {
    setSendingInvites(eventId)
    try {
      const res = await fetch(`${baseUrl}/admin/events/send-invite/${eventId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to send invitations")
      }

      const data = await res.json()
      toast.success(`Successfully sent invitations to ${data.data.successCount} guests`)
      fetchEvents()
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitations")
    } finally {
      setSendingInvites(null)
    }
  }

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = events

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.eventType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(event => event.eventType === typeFilter)
    }

    setFilteredEvents(filtered)
  }, [searchTerm, statusFilter, typeFilter, events])

  // Initial load
  useEffect(() => {
    fetchEvents()
  }, [])

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status badge color
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

  // Get event type badge color
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
    <div className="p-6 max-w-full">
      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="PIZZA_NIGHT">Pizza Night</option>
          <option value="SPECIAL_DINNER">Special Dinner</option>
          <option value="WINE_TASTING">Wine Tasting</option>
          <option value="COOKING_CLASS">Cooking Class</option>
          <option value="ENHANCEMNET">Enhancement</option>
          <option value="OTHERS">Others</option>
        </select>

        <button
          onClick={fetchEvents}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <RiRefreshLine className={loading ? "animate-spin" : ""} />
          Refresh
        </button>

        <button
          onClick={() => setIsCreateEventModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RiAddLine />
          Create Event
        </button>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <BiLoader className="animate-spin text-4xl text-blue-600" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <RiCalendarEventLine className="text-6xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No events found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.name}</div>
                      {event.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {event.description.slice(0, 20)}...
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(event.eventType)}`}>
                      {event.eventType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <span className="text-green-600 font-medium text-sm">
                            {event.eventParticipants?.filter(p => p.status === 'COMPLETED').length || 0}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">confirmed</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <span className="text-red-600 font-medium text-sm">
                            {event.eventParticipants?.filter(p => p.status === 'CANCELLED' || p.status === 'DECLINED').length || 0}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">cancelled</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <span className="text-yellow-600 font-medium text-sm">
                            {event.eventParticipants?.filter(p => p.status === 'PENDING').length || 0}
                          </span>
                          <span className="text-gray-400 text-xs ml-1">pending</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    €{event.totalRevenue?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedEvent(event)
                          setIsViewEventModalOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View Details"
                      >
                        <RiEyeLine className="text-lg" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEvent(event)
                          setIsUpdateEventModalOpen(true)
                        }}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Edit Event"
                      >
                        <RiEdit2Line className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleSendInvitations(event.id)}
                        className="text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Send Invitations"
                        disabled={sendingInvites === event.id || event.status === 'CANCELLED' || event.status === 'COMPLETED'}
                      >
                        {sendingInvites === event.id ? (
                          <BiLoader className="text-lg animate-spin" />
                        ) : (
                          <RiMailSendLine className="text-lg" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEvent(event)
                          setIsDeleteEventModalOpen(true)
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete Event"
                      >
                        <RiDeleteBin6Line className="text-lg" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEvent(event)
                          setIsAuditLogModalOpen(true)
                        }}
                        className="relative text-gray-600 hover:text-gray-800 transition-colors"
                        title="View Audit Logs"
                      >
                        <History className="text-lg" />
                        {event.logs && event.logs.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {event.logs.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteEventModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the event "{selectedEvent.name}"? 
              {selectedEvent.totalGuests > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This event has {selectedEvent.totalGuests} participants!
                </span>
              )}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsDeleteEventModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={loadingAction}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingAction && <BiLoader className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isCreateEventModalOpen && (
        <CreateEventModal
          isOpen={isCreateEventModalOpen}
          onClose={() => setIsCreateEventModalOpen(false)}
          onSuccess={() => {
            setIsCreateEventModalOpen(false)
            fetchEvents()
          }}
        />
      )}

      {isUpdateEventModalOpen && selectedEvent && (
        <UpdateEventModal
          isOpen={isUpdateEventModalOpen}
          event={selectedEvent}
          onClose={() => {
            setIsUpdateEventModalOpen(false)
            setSelectedEvent(null)
          }}
          onSuccess={() => {
            setIsUpdateEventModalOpen(false)
            setSelectedEvent(null)
            fetchEvents()
          }}
        />
      )}

      {isViewEventModalOpen && selectedEvent && (
        <ViewEventModal
          isOpen={isViewEventModalOpen}
          event={selectedEvent}
          onClose={() => {
            setIsViewEventModalOpen(false)
            setSelectedEvent(null)
          }}
          onUpdate={() => {
            fetchEvents() // Refresh the events list
          }}
        />
      )}


      {isAuditLogModalOpen && selectedEvent && (
        <EventAuditLogModal
          isOpen={isAuditLogModalOpen}
          event={selectedEvent}
          onClose={() => {
            setIsAuditLogModalOpen(false)
            setSelectedEvent(null)
          }}
        />
      )}
    </div>
  )
}