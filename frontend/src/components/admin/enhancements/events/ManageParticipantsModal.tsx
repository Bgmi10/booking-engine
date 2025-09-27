import { useState, useEffect } from 'react';
import { RiCloseLine, RiSearchLine, RiUserAddLine, RiLoader4Line, RiCloseFill } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { baseUrl } from '../../../../utils/constants';
import type { Event } from '../../../../types/types';
import { useEventParticipants } from '../../../../hooks/useEventParticipants';

interface BookingGuest {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isMainBookingGuest: boolean;
  invitationId?: string;
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  participantId?: string;
  addedBy?: 'GUEST' | 'MAIN_GUEST' | 'ADMIN';
  participantNotes?: string;
}

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  room: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
  };
  paymentIntent?: {
    id: string;
    status: string;
  };
  guests: BookingGuest[];
}

interface ManageParticipantsModalProps {
  isOpen: boolean;
  event: Event & {
    provisional?: {
      plannedAttendees: number;
      notes?: string;
      registryStatus: string;
    };
  };
  onClose: () => void;
  onUpdate: () => void;
  paymentIntentId?: string; // Optional: only show bookings from this payment intent
}

export default function ManageParticipantsModal({
  isOpen,
  event,
  onClose,
  onUpdate,
  paymentIntentId
}: ManageParticipantsModalProps) {
  const { 
    addParticipant, 
    removeParticipant 
  } = useEventParticipants();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingGuest, setAddingGuest] = useState<string | null>(null);
  const [removingGuest, setRemovingGuest] = useState<string | null>(null);
  const [selectedEnhancement, setSelectedEnhancement] = useState<string>('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');
  const [selectedGuestData, setSelectedGuestData] = useState<{bookingId: string; customerId: string; participantId?: string} | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && event) {
      // Set default enhancement if available
      if (event.eventEnhancements && event.eventEnhancements?.length > 0) {
        setSelectedEnhancement(event.eventEnhancements[0].enhancementId);
      }
      // Load all bookings with their guests
      loadBookings();
    }
  }, [isOpen, event]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Get all bookings with their guests
      const response = await fetch(`${baseUrl}/admin/events/${event.id}/bookings`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to load bookings");
      }
      
      const data = await response.json();
      let bookingsData = data.data || [];
      
      // If paymentIntentId is provided, filter bookings to only show ones from this payment intent
      if (paymentIntentId) {
        bookingsData = bookingsData.filter((booking: any) => 
          booking.paymentIntent?.id === paymentIntentId
        );
      }
      
      setBookings(bookingsData);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = (bookingId: string, customerId: string) => {
    setActionType('add');
    setSelectedGuestData({ bookingId, customerId });
    setReason('');
    setNotes('');
    setShowReasonModal(true);
  };

  const handleRemoveClick = (participantId: string | undefined, customerId: string) => {
    setActionType('remove');
    setSelectedGuestData({ bookingId: '', customerId, participantId });
    setReason('');
    setNotes('');
    setShowReasonModal(true);
  };

  const processAction = async () => {
    if (!selectedGuestData) return;
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setShowReasonModal(false);

    if (actionType === 'add') {
      setAddingGuest(selectedGuestData.customerId);
      try {
        await addParticipant(event.id, {
          customerId: selectedGuestData.customerId,
          bookingId: selectedGuestData.bookingId,
          enhancementId: selectedEnhancement,
          paymentIntentId: paymentIntentId, // Include if provided
          reason,
          notes
        });
        
        // Reload bookings to refresh the guest list
        await loadBookings();
        onUpdate(); // Refresh parent data
      } catch (error: any) {
        // Error already handled by the hook
      } finally {
        setAddingGuest(null);
      }
    } else {
      setRemovingGuest(selectedGuestData.customerId);
      try {
        await removeParticipant(event.id, selectedGuestData.participantId!, { 
          reason, 
          notes 
        });
        
        // Reload bookings to refresh the guest list
        await loadBookings();
        onUpdate(); // Refresh parent data
      } catch (error) {
        // Error already handled by the hook
      } finally {
        setRemovingGuest(null);
      }
    }
  };

  // Filter bookings based on search term (client-side)
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.room.name.toLowerCase().includes(searchLower) ||
      booking.customer.guestFirstName.toLowerCase().includes(searchLower) ||
      booking.customer.guestLastName.toLowerCase().includes(searchLower) ||
      booking.customer.guestEmail.toLowerCase().includes(searchLower) ||
      booking.guests.some(g => 
        g.firstName.toLowerCase().includes(searchLower) ||
        g.lastName.toLowerCase().includes(searchLower) ||
        g.email.toLowerCase().includes(searchLower)
      )
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Event Participants</h2>
            <p className="text-sm text-gray-600 mt-1">{event.name} - {event.totalGuests} participants</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RiCloseLine className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search bookings, rooms, or guests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button
                onClick={() => filteredBookings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                Search
              </button>
            </div>
          </div>


          {/* Provisional Registry Info */}
          {event.provisional && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-1">Pre-Registration Information</h4>
                  <p className="text-sm text-yellow-700">
                    <span className="font-medium">{event.provisional.plannedAttendees}</span> guests have pre-registered for this event during booking.
                  </p>
                  {event.provisional.notes && (
                    <p className="text-sm text-yellow-600 mt-1">
                      Note: {event.provisional.notes}
                    </p>
                  )}
                  <p className="text-xs text-yellow-600 mt-2">
                    Status: <span className="font-medium">{event.provisional.registryStatus}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bookings List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bookings and Guests</h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <RiLoader4Line className="animate-spin text-3xl text-gray-400" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No bookings match your search' : 'No bookings available'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Booking Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {booking.room.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Main Guest: {booking.customer.guestFirstName} {booking.customer.guestLastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">
                            {booking.guests.length} guest(s) in booking
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Guests List */}
                    <div className="divide-y divide-gray-200">{booking.guests.map((guest: BookingGuest) => (
                      <div key={guest.customerId} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {guest.firstName} {guest.lastName}
                              </p>
                              {guest.isMainBookingGuest && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  Main Guest
                                </span>
                              )}
                              {guest.invitationStatus && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  guest.invitationStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                  guest.invitationStatus === 'DECLINED' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {guest.invitationStatus}
                                </span>
                              )}
                              {guest.addedBy && (
                                <span className="text-xs text-gray-500">
                                  (Added by: {guest.addedBy === 'ADMIN' ? 'Admin' : guest.addedBy === 'MAIN_GUEST' ? 'Main Guest' : 'Self'})
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{guest.email}</p>
                            {guest.participantNotes && (
                              <p className="text-xs text-gray-500 italic mt-1">
                                Note: {guest.participantNotes}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {guest.participantId ? (
                              // Guest is already in event - show remove button
                              <button
                                onClick={() => handleRemoveClick(guest.participantId, guest.customerId)}
                                disabled={removingGuest === guest.customerId}
                                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {removingGuest === guest.customerId ? (
                                  <RiLoader4Line className="animate-spin" />
                                ) : (
                                  <>
                                    <RiCloseFill />
                                    Remove
                                  </>
                                )}
                              </button>
                            ) : (
                              // Guest is not in event - show add button
                              <button
                                onClick={() => handleAddClick(booking.id, guest.customerId)}
                                disabled={addingGuest === guest.customerId}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {addingGuest === guest.customerId ? (
                                  <RiLoader4Line className="animate-spin" />
                                ) : (
                                  <>
                                    <RiUserAddLine />
                                    {guest.invitationStatus === 'PENDING' ? 'Quick Accept' :
                                     guest.invitationStatus === 'DECLINED' ? 'Add Anyway' :
                                     'Add to Event'}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {actionType === 'add' ? 'Add Guest to Event' : 'Remove Guest from Event'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={actionType === 'add' ? 'Why are you adding this guest?' : 'Why are you removing this guest?'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for internal reference..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={processAction}
                disabled={!reason.trim()}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === 'add' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionType === 'add' ? 'Add Guest' : 'Remove Guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}