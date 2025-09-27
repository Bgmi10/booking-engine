import { useState, useEffect } from "react";
import { X, Users, Mail, User, Hash, Clock, CheckCircle, AlertCircle, UserPlus, UserMinus, Search, Loader2 } from "lucide-react";
import { type EventGuestRegistry } from "../../../types/types";
import { baseUrl } from "../../../utils/constants";
import { useEventParticipants } from "../../../hooks/useEventParticipants";
import toast from "react-hot-toast";

interface ManageAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventGuestRegistryId: string;
}

interface AvailableCustomer {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  bookingId: string;
  isMainGuest: boolean;
}

export default function ManageAttendeesModal({
  isOpen,
  onClose,
  eventGuestRegistryId,
}: ManageAttendeesModalProps) {
  const [loading, setLoading] = useState(false);
  const [eventGuestRegistry, setEventGuestRegistry] = useState<EventGuestRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableCustomers, setAvailableCustomers] = useState<AvailableCustomer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [addingCustomerId, setAddingCustomerId] = useState<string | null>(null);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [showAddReasonModal, setShowAddReasonModal] = useState(false);
  const [showRemoveReasonModal, setShowRemoveReasonModal] = useState(false);
  const [selectedCustomerToAdd, setSelectedCustomerToAdd] = useState<AvailableCustomer | null>(null);
  const [selectedParticipantToRemove, setSelectedParticipantToRemove] = useState<{id: string, eventId: string} | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  
  const { addParticipant, removeParticipant } = useEventParticipants();

  useEffect(() => {
    if (isOpen && eventGuestRegistryId) {
      fetchEventGuestRegistry();
    }
  }, [isOpen, eventGuestRegistryId]);

  const fetchEventGuestRegistry = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/admin/events/${eventGuestRegistryId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch event guest registry');
      }

      const data = await response.json();
      setEventGuestRegistry(data.data);
    } catch (error) {
      console.error('Error fetching event guest registry:', error);
      setError('Failed to load event attendee data');
    } finally {
      setLoading(false);
    }
  };

  const searchAvailableCustomers = async () => {
    if (!eventGuestRegistry) return;
    
    setSearchingCustomers(true);
    try {
      // Search for customers from the same booking who are not already participants
      const response = await fetch(
        `${baseUrl}/admin/bookings/${eventGuestRegistry.bookingId}/customers?excludeEventId=${eventGuestRegistry.selectedEvents?.[0]?.eventId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to search customers');
      }

      const data = await response.json();
      
      // Filter out customers who are already participants
      const participantCustomerIds = eventGuestRegistry.eventParticipants?.map(p => p.customerId) || [];
      const filtered = (data.data || []).filter(
        (customer: AvailableCustomer) => !participantCustomerIds.includes(customer.id)
      );
      
      setAvailableCustomers(filtered);
    } catch (error) {
      console.error('Error searching customers:', error);
      toast.error('Failed to load available guests');
    } finally {
      setSearchingCustomers(false);
    }
  };

  const handleAddParticipant = async (customer: AvailableCustomer) => {
    setSelectedCustomerToAdd(customer);
    setShowAddReasonModal(true);
  };

  const confirmAddParticipant = async () => {
    if (!eventGuestRegistry || !eventGuestRegistry.selectedEvents?.[0] || !selectedCustomerToAdd) {
      toast.error('Event information not available');
      return;
    }

    const eventInfo = eventGuestRegistry.selectedEvents[0];
    if (!eventInfo.eventId) {
      toast.error('Event details are incomplete');
      return;
    }

    setAddingCustomerId(selectedCustomerToAdd.id);
    try {
      await addParticipant(eventInfo.eventId, {
        customerId: selectedCustomerToAdd.id,
        bookingId: selectedCustomerToAdd.bookingId,
        enhancementId: eventInfo.id || eventInfo.enhancementId, // Use eventInfo.id first (array format), fallback to enhancementId
        paymentIntentId: eventGuestRegistry.paymentIntentId,
        reason: reason || 'Added by admin',
        notes: notes || 'Added through attendee management'
      });
      
      // Refresh the data
      await fetchEventGuestRegistry();
      setShowAddGuest(false);
      setShowAddReasonModal(false);
      setSearchTerm("");
      setAvailableCustomers([]);
      setReason("");
      setNotes("");
      setSelectedCustomerToAdd(null);
    } catch (error) {
      console.error('Error adding participant:', error);
    } finally {
      setAddingCustomerId(null);
    }
  };

  const handleRemoveParticipant = async (participantId: string, eventId: string) => {
    setSelectedParticipantToRemove({id: participantId, eventId});
    setShowRemoveReasonModal(true);
  };

  const confirmRemoveParticipant = async () => {
    if (!selectedParticipantToRemove) return;

    setRemovingParticipantId(selectedParticipantToRemove.id);
    try {
      await removeParticipant(selectedParticipantToRemove.eventId, selectedParticipantToRemove.id, {
        reason: reason || 'Removed by admin',
        notes: notes || 'Removed through attendee management'
      });
      
      // Refresh the data
      await fetchEventGuestRegistry();
      setShowRemoveReasonModal(false);
      setReason("");
      setNotes("");
      setSelectedParticipantToRemove(null);
    } catch (error) {
      console.error('Error removing participant:', error);
    } finally {
      setRemovingParticipantId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PROVISIONAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getParticipantStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
      case 'DECLINED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSubGuests = (subGuests: any) => {
    if (!subGuests) return [];
    
    try {
      if (typeof subGuests === 'string') {
        return JSON.parse(subGuests);
      }
      if (Array.isArray(subGuests)) {
        return subGuests;
      }
      return [];
    } catch (error) {
      console.error('Error parsing subGuests:', error);
      return [];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Event Attendee Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage event participants and guest registry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading attendee data...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchEventGuestRegistry}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : eventGuestRegistry ? (
            <div className="space-y-6">
              {/* Registry Summary */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-900">Guest Registry Summary</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(eventGuestRegistry.status)}`}>
                    {eventGuestRegistry.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-600">Main Guest</span>
                    </div>
                    <p className="font-semibold text-gray-900">{eventGuestRegistry.mainGuestName}</p>
                    <p className="text-sm text-gray-600">{eventGuestRegistry.mainGuestEmail}</p>
                    {eventGuestRegistry.mainGuestPhone && (
                      <p className="text-sm text-gray-600">{eventGuestRegistry.mainGuestPhone}</p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-600">Total Guests</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{eventGuestRegistry.totalGuestCount}</p>
                  </div>
                  
                  <div className="bg-white rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Confirmed</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{eventGuestRegistry.confirmedGuests}</p>
                  </div>
                  
                  <div className="bg-white rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Check-in Sync</span>
                    </div>
                    <p className={`text-sm font-medium ${eventGuestRegistry.syncedWithCheckIn ? 'text-green-600' : 'text-yellow-600'}`}>
                      {eventGuestRegistry.syncedWithCheckIn ? 'Synced' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Participants */}
              {eventGuestRegistry.eventParticipants && eventGuestRegistry.eventParticipants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Event Participants</h3>
                    <button
                      onClick={() => {
                        setShowAddGuest(true);
                        searchAvailableCustomers();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Guest
                    </button>
                  </div>
                  <div className="space-y-3">
                    {eventGuestRegistry.eventParticipants.map((participant) => (
                      <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-900">
                                  {participant.customer?.guestFirstName} {participant.customer?.guestLastName}
                                </span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getParticipantStatusColor(participant.status)}`}>
                                {participant.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{participant.customer?.guestEmail}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span>Type: {participant.participantType}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span>Added by: {participant.addedBy}</span>
                              </div>
                            </div>
                            
                            {participant.notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                <span className="font-medium">Notes:</span> {participant.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className="text-sm text-gray-500 mb-2">
                              Added: {new Date(participant.createdAt).toLocaleDateString()}
                            </div>
                            <button
                              onClick={() => handleRemoveParticipant(participant.id, participant.eventId)}
                              disabled={removingParticipantId === participant.id}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-xs disabled:opacity-50"
                            >
                              {removingParticipantId === participant.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <UserMinus className="h-3 w-3" />
                              )}
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub Guests */}
              {eventGuestRegistry.subGuests && formatSubGuests(eventGuestRegistry.subGuests).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sub Guests ({formatSubGuests(eventGuestRegistry.subGuests).length})</h3>
                  <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {formatSubGuests(eventGuestRegistry.subGuests).map((guest: any, index: number) => (
                      <div key={index} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">
                                {guest.name || 'N/A'}
                              </p>
                              {guest.type && guest.type !== 'guest' && (
                                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                                  {guest.type}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{guest.email || 'N/A'}</p>
                            <p className="text-sm text-gray-600">{guest.phone || 'N/A'}</p>
                            {guest.addedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Added: {new Date(guest.addedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Check if this guest is already a participant in the event */}
                            {eventGuestRegistry.eventParticipants?.some(p => p.customerId === guest.customerId) ? (
                              <button
                                onClick={() => {
                                  const participant = eventGuestRegistry.eventParticipants?.find(p => p.customerId === guest.customerId);
                                  if (participant) {
                                    handleRemoveParticipant(participant.id, participant.eventId);
                                  }
                                }}
                                disabled={removingParticipantId === guest.customerId}
                                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {removingParticipantId === guest.customerId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserMinus className="h-4 w-4" />
                                    Remove
                                  </>
                                )}
                              </button>
                            ) : guest.customerId ? (
                              <button
                                onClick={() => {
                                  const customerData: AvailableCustomer = {
                                    id: guest.customerId,
                                    guestFirstName: guest.name?.split(' ')[0] || '',
                                    guestLastName: guest.name?.split(' ').slice(1).join(' ') || '',
                                    guestEmail: guest.email || '',
                                    bookingId: eventGuestRegistry.bookingId || eventGuestRegistry.booking?.id || '',
                                    isMainGuest: false
                                  };
                                  handleAddParticipant(customerData);
                                }}
                                disabled={addingCustomerId === guest.customerId}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {addingCustomerId === guest.customerId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4" />
                                    Add to Event
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500 italic">No customer ID</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!eventGuestRegistry.eventParticipants || eventGuestRegistry.eventParticipants.length === 0) && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Event Participants</h3>
                  <p className="text-gray-600 mb-4">No participants have been registered for this event yet.</p>
                  <button
                    onClick={() => {
                      setShowAddGuest(true);
                      searchAvailableCustomers();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors mx-auto"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add First Guest
                  </button>
                </div>
              )}

              {/* Add Guest Modal */}
              {showAddGuest && (
                <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[60]">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Add Guest to Event</h3>
                      <button
                        onClick={() => {
                          setShowAddGuest(false);
                          setSearchTerm("");
                          setAvailableCustomers([]);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {searchingCustomers ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                          <span className="ml-2 text-gray-600">Loading available guests...</span>
                        </div>
                      ) : availableCustomers.length > 0 ? (
                        <div className="space-y-2">
                          {availableCustomers
                            .filter(c => 
                              searchTerm === "" ||
                              `${c.guestFirstName} ${c.guestLastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.guestEmail.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((customer) => (
                              <div key={customer.id} className="border border-gray-200 rounded-md p-3 hover:bg-gray-50">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {customer.guestFirstName} {customer.guestLastName}
                                      {customer.isMainGuest && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Main Guest</span>
                                      )}
                                    </p>
                                    <p className="text-sm text-gray-600">{customer.guestEmail}</p>
                                  </div>
                                  <button
                                    onClick={() => handleAddParticipant(customer)}
                                    disabled={addingCustomerId === customer.id}
                                    className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                                  >
                                    {addingCustomerId === customer.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Add"
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No available guests found</p>
                          <p className="text-sm mt-1">All booking guests may already be added to this event</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No event guest registry data found.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Add Reason Modal */}
      {showAddReasonModal && selectedCustomerToAdd && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[70]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Guest to Event</h3>
              <button
                onClick={() => {
                  setShowAddReasonModal(false);
                  setSelectedCustomerToAdd(null);
                  setReason("");
                  setNotes("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">
                {selectedCustomerToAdd.guestFirstName} {selectedCustomerToAdd.guestLastName}
              </p>
              <p className="text-sm text-gray-600">{selectedCustomerToAdd.guestEmail}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for adding
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Customer request, Admin correction..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddReasonModal(false);
                  setSelectedCustomerToAdd(null);
                  setReason("");
                  setNotes("");
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddParticipant}
                disabled={addingCustomerId === selectedCustomerToAdd.id}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addingCustomerId === selectedCustomerToAdd.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Guest
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Reason Modal */}
      {showRemoveReasonModal && selectedParticipantToRemove && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[70]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Remove Participant</h3>
              <button
                onClick={() => {
                  setShowRemoveReasonModal(false);
                  setSelectedParticipantToRemove(null);
                  setReason("");
                  setNotes("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="font-medium text-red-900">Confirm Removal</p>
              </div>
              <p className="text-sm text-red-700">
                This will permanently remove the participant from the event. Please provide a reason below.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for removal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Customer cancellation, No-show, Admin correction..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRemoveReasonModal(false);
                  setSelectedParticipantToRemove(null);
                  setReason("");
                  setNotes("");
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveParticipant}
                disabled={!reason.trim() || removingParticipantId === selectedParticipantToRemove.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {removingParticipantId === selectedParticipantToRemove.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <UserMinus className="h-4 w-4" />
                    Remove Participant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}