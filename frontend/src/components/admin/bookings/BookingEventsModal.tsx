import { useState, useEffect } from "react";
import { X, Calendar, Users, Eye, UserPlus, DollarSign } from "lucide-react";
import { useEventParticipants } from "../../../hooks/useEventParticipants";
import ManageParticipantsModal from "../enhancements/events/ManageParticipantsModal";
import ViewEventModal from "../enhancements/events/ViewEventModal";

interface BookingEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentIntentId: string;
  bookings: any[];
}

interface EventParticipant {
  id: string;
  status: string;
  addedBy: string;
  participantType: string;
  price: number;
  createdAt: string;
  notes?: string;
  customer: {
    id: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
  };
  booking: {
    id: string;
    room: {
      name: string;
    };
  };
  enhancement: {
    id: string;
    name: string;
    price: number;
  };
}

interface EventData {
  event: {
    id: string;
    name: string;
    description: string;
    eventDate: string;
    eventType: string;
    maxCapacity: number;
    totalGuests: number;
    totalRevenue: number;
    status: string;
    eventEnhancements: Array<{
      id: string;
      enhancement: {
        id: string;
        name: string;
        price: number;
      };
      overridePrice?: number;
    }>;
    _count?: {
      eventInvitations: number;
    };
    eventParticipants?: any[];
    createdAt: string;
    updatedAt: string;
  };
  participants: EventParticipant[];
  provisional?: {
    plannedAttendees: number;
    notes?: string;
    registryStatus: string;
  };
}

export default function BookingEventsModal({
  isOpen,
  onClose,
  paymentIntentId,
}: BookingEventsModalProps) {
  const { 
    loading: participantLoading, 
    getEventsByPaymentIntent 
  } = useEventParticipants();
  
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventData[]>([]);
  const [registry, setRegistry] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showManageParticipants, setShowManageParticipants] = useState(false);
  const [showViewEvent, setShowViewEvent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getEventsByPaymentIntent(paymentIntentId);
      setEvents(data.events || []);
      setRegistry(data.registry || null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEvent = (eventData: EventData) => {
    // Convert to the format expected by ViewEventModal
    const formattedEvent = {
      ...eventData.event,
      eventParticipants: eventData.participants
    };
    setSelectedEvent(formattedEvent);
    setShowViewEvent(true);
  };

  const handleManageParticipants = (eventData: EventData) => {
    // Convert to the format expected by ManageParticipantsModal
    const formattedEvent = {
      ...eventData.event,
      eventParticipants: eventData.participants
    };
    setSelectedEvent(formattedEvent);
    setShowManageParticipants(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'PIZZA_NIGHT':
        return 'bg-orange-100 text-orange-800';
      case 'SPECIAL_DINNER':
        return 'bg-purple-100 text-purple-800';
      case 'WINE_TASTING':
        return 'bg-pink-100 text-pink-800';
      case 'COOKING_CLASS':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-indigo-100 text-indigo-800';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold">Events Management for Booking</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Registry Information */}
            {registry && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Event Pre-Registration Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-blue-600">Main Guest:</span>
                        <p className="font-medium text-blue-900">{registry.mainGuest}</p>
                      </div>
                      <div>
                        <span className="text-blue-600">Total Party Size:</span>
                        <p className="font-medium text-blue-900">{registry.totalGuestCount} guests</p>
                      </div>
                      <div>
                        <span className="text-blue-600">Confirmed Guests:</span>
                        <p className="font-medium text-blue-900">{registry.confirmedGuests} of {registry.totalGuestCount}</p>
                      </div>
                      <div>
                        <span className="text-blue-600">Status:</span>
                        <p className="font-medium text-blue-900">{registry.status}</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Guests have pre-selected events during booking. Final details will be confirmed at check-in.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* All Events Table - Show ALL events during stay */}
            {loading || participantLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No events available during this booking's stay period</p>
                <p className="text-sm text-gray-400">Events must fall between check-in and check-out dates</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-3">Events During Stay Period</h3>
                <div className="overflow-x-auto">
                  <table className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Booking Participants</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {events.map((eventData) => {
                        const event = eventData.event;
                        const participants = eventData.participants || [];
                        const participantCount = participants.length;
                        const revenue = participants.reduce((sum, p) => sum + p.price, 0);
                        
                        return (
                          <tr key={event.id} className={`hover:bg-gray-50 ${participantCount > 0 ? 'bg-green-50' : ''}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{event.name}</span>
                                  {participantCount > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Joined
                                    </span>
                                  )}
                                  {eventData.provisional && !participantCount && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Pre-registered
                                    </span>
                                  )}
                                </div>
                                {event.description && (
                                  <div className="text-sm text-gray-500">{event.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(event.eventType || 'ENHANCEMENT')}`}>
                                {(event.eventType || 'ENHANCEMENT').replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatDate(event.eventDate)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1 text-gray-400" />
                                  <span className="text-sm font-medium">
                                    {participantCount}
                                  </span>
                                  <span className="text-sm text-gray-500 ml-1">
                                    / {event.totalGuests || 0} total
                                  </span>
                                </div>
                                {eventData.provisional && (
                                  <div className="text-xs text-yellow-600">
                                    {eventData.provisional.plannedAttendees} planned
                                    {eventData.provisional.notes && (
                                      <span className="ml-1 text-gray-500">({eventData.provisional.notes})</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center text-green-600">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {revenue.toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                {event.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleViewEvent(eventData)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="View Event"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleManageParticipants(eventData)}
                                  className="text-purple-600 hover:text-purple-800"
                                  title="Manage Participants"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                  <div className="bg-indigo-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {events.length}
                    </div>
                    <div className="text-sm text-gray-600">Available Events</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {events.filter(e => e.participants.length > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Events Joined</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {events.reduce((sum, e) => sum + e.participants.length, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Participants</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      €{events.reduce((sum, e) => 
                        sum + e.participants.reduce((pSum, p) => pSum + p.price, 0), 0
                      ).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manage Participants Modal */}
      {showManageParticipants && selectedEvent && (
        <ManageParticipantsModal
          isOpen={showManageParticipants}
          event={selectedEvent}
          paymentIntentId={paymentIntentId} // Pass payment intent to filter bookings
          onClose={() => {
            setShowManageParticipants(false);
            setSelectedEvent(null);
          }}
          onUpdate={() => {
            fetchEvents();
            setShowManageParticipants(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* View Event Modal */}
      {showViewEvent && selectedEvent && (
        <ViewEventModal
          isOpen={showViewEvent}
          event={selectedEvent}
          onClose={() => {
            setShowViewEvent(false);
            setSelectedEvent(null);
          }}
          onUpdate={() => {
            fetchEvents();
          }}
        />
      )}
    </>
  );
}