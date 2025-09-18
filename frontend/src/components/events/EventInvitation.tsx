import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Loader2, Users, UserPlus, X } from 'lucide-react';
import { baseUrl } from '../../utils/constants';
import Header from '../Header';

interface EventData {
  id: string;
  name: string;
  description: string;
  eventDate: string;
  eventType: string;
  location?: string;
  eventEnhancements?: Array<{
    enhancement: {
      name: string;
      description: string;
      price: number;
      tax: number;
      image?: string;
    };
    overridePrice?: number;
  }>;
}

interface BookingData {
  id: string;
  checkIn: string;
  checkOut: string;
  room: {
    name: string;
  };
}

interface InvitationData {
  status: 'VALID' | 'EXPIRED' | 'ALREADY_ACCEPTED' | 'ALREADY_DECLINED';
  invitation?: {
    id: string;
    event: EventData;
    booking: BookingData;
    customer: {
      guestFirstName: string;
      guestLastName: string;
      guestEmail: string;
    };
    isMainGuest: boolean;
  };
  event?: EventData;
  booking?: BookingData;
}

interface BookingGuest {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  isMainBookingGuest: boolean;
  invitationId?: string;
  invitationStatus?: string;
  acceptedAt?: string;
  declinedAt?: string;
  addedBy?: 'GUEST' | 'MAIN_GUEST' | 'ADMIN';
}

export default function EventInvitation() {
  const { token, action } = useParams<{ token: string; action?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [invitedGuests, setInvitedGuests] = useState<BookingGuest[]>([]);
  const [availableGuests, setAvailableGuests] = useState<BookingGuest[]>([]);
  const [addingGuest, setAddingGuest] = useState(false);
 
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // Auto-process if action is provided in URL
    if (action === 'accept' || action === 'decline') {
      handleResponse(action);
    } else {
      verifyInvitation();
    }
  }, [token, action]);

  useEffect(() => {
    // Load guests list if main guest has accepted
    if (invitationData?.invitation?.isMainGuest && 
        (invitationData?.status === 'ALREADY_ACCEPTED' || invitationData?.invitation?.invitationStatus === 'ACCEPTED')) {
      loadBookingGuests();
    }
  }, [invitationData, token]);

  const verifyInvitation = async () => {
    try {
      const response = await fetch(`${baseUrl}/customers/event-invitation/${token}/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to verify invitation');
        setLoading(false);
        return;
      }

      setInvitationData(data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error verifying invitation:', err);
      setError('Failed to load invitation details');
      setLoading(false);
    }
  };

  const handleResponse = async (response: 'accept' | 'decline') => {
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${baseUrl}/customers/event-invitation/${token}/${response}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...(response === 'decline' && { reason: 'Unable to attend' })
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || `Failed to ${response} invitation`);
        setProcessing(false);
        // If already responded, still verify to show the status
        if (data.message?.includes('already')) {
          verifyInvitation();
        }
        return;
      }

      // Update invitation status locally instead of redirecting
      setInvitationData(prev => ({
        ...prev!,
        status: response === 'accept' ? 'ALREADY_ACCEPTED' : 'ALREADY_DECLINED'
      }));
      setResponseMessage(data.data.message);
      setProcessing(false);
    } catch (err) {
      console.error(`Error ${response}ing invitation:`, err);
      setError(`Failed to ${response} invitation`);
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadBookingGuests = async () => {
    try {
      const response = await fetch(`${baseUrl}/customers/event-invitation/${token}/guests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitedGuests(data.data.invitedGuests || []);
        setAvailableGuests(data.data.availableToInvite || []);
      }
    } catch (err) {
      console.error('Error loading guests list:', err);
    }
  };

  const handleAddGuestToEvent = async (customerId: string) => {
    setAddingGuest(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/customers/event-invitation/${token}/add-guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customerId })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to add guest to event');
        setAddingGuest(false);
        return;
      }

      // Reload the guest list to reflect changes
      await loadBookingGuests();
      setAddingGuest(false);
    } catch (err) {
      console.error('Error adding guest to event:', err);
      setError('Failed to add guest to event');
      setAddingGuest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invitation Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }


  const { invitation } = invitationData || {};
  const event = invitation?.event || invitationData?.event;
  const booking = invitation?.booking || invitationData?.booking;

  // Handle different invitation statuses
  if (invitationData?.status === 'EXPIRED') {
    return (
      <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invitation Expired</h1>
          <p className="text-gray-600 mb-6">
            This invitation has expired. Please contact the hotel reception for assistance.
          </p>
          <div className="text-sm text-gray-500">
            <p>Phone: +39 123 456 7890</p>
            <p>Email: info@latorresullaviafrancigena.com</p>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (invitationData?.status === 'ALREADY_ACCEPTED') {
    // Check if this is a main guest - from the invitation data
    const isMainGuest = invitationData?.invitation?.isMainGuest || false;
    
    return (
      <>
      <Header />
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Attendance Confirmed</h1>
              <p className="text-gray-600">
                {isMainGuest ? 
                  "Thank you for confirming! As the main guest, you can invite additional guests below." :
                  "You have already confirmed your attendance for this event."
                }
              </p>
            </div>
            
            {event && (
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex gap-4">
                    {/* Compact images for all enhancements */}
                    {event.eventEnhancements && event.eventEnhancements.length > 0 && (
                      <div className="flex gap-2 flex-shrink-0">
                        {event.eventEnhancements.map((ee, idx) => 
                          ee.enhancement.image ? (
                            <img 
                              key={idx}
                              src={ee.enhancement.image} 
                              alt={ee.enhancement.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ) : null
                        )}
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-gray-800">{event.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(event.eventDate)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(event.eventDate)}
                      </p>
                      {/* Show all enhancement prices with tax breakdown */}
                      {event.eventEnhancements && event.eventEnhancements.length > 0 && (
                        <div className="pt-2 border-t">
                          {event.eventEnhancements.map((ee, idx) => {
                            const totalPrice = ee.overridePrice || ee.enhancement.price;
                            const tax = ee.enhancement.tax || 0;
                            const taxAmount = tax > 0 ? (totalPrice * tax) / (100 + tax) : 0;
                            const subtotal = totalPrice - taxAmount;
                            
                            return (
                              <div key={idx} className="mb-2 p-2 bg-white rounded border">
                                <div className="font-medium text-gray-800 text-sm mb-1">{ee.enhancement.name}</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span>€{subtotal.toFixed(2)}</span>
                                  </div>
                                  {tax > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">IVA {tax}%</span>
                                      <span>€{taxAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-semibold pt-1 border-t">
                                    <span>Total</span>
                                    <span className="text-green-600">€{totalPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="text-xs text-gray-500 italic mt-2">
                            * Taxes included in price
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isMainGuest && (
              <div className="border-t pt-6">
              
                {invitedGuests.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-2">Guests Added to Event ({invitedGuests.length})</h4>
                    <div className="space-y-2">
                      {invitedGuests.map((guest) => (
                        <div key={guest.customerId} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800">
                                {guest.firstName} {guest.lastName}
                                {guest.isMainBookingGuest && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Main Guest</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">{guest.email}</p>
                              {guest.addedBy && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Added by: {
                                    guest.addedBy === 'GUEST' ? 'Self' :
                                    guest.addedBy === 'MAIN_GUEST' ? 'Main Guest' :
                                    guest.addedBy === 'ADMIN' ? 'Admin' : guest.addedBy
                                  }
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {guest.invitationStatus === 'ACCEPTED' && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ✓ Accepted
                                </span>
                              )}
                              {guest.invitationStatus === 'DECLINED' && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                  ✗ Declined
                                </span>
                              )}
                              {guest.invitationStatus === 'PENDING' && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available guests from booking that can be added */}
                {availableGuests.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Available Booking Guests to Add ({availableGuests.length})</h4>
                    <div className="space-y-2">
                      {availableGuests.map((guest: any) => (
                        <div key={guest.customerId} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800">
                                {guest.firstName} {guest.lastName}
                                {guest.isMainBookingGuest && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Main Guest</span>
                                )}
                                {guest.currentStatus === 'PENDING' && (
                                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Invitation Pending</span>
                                )}
                                {guest.currentStatus === 'DECLINED' && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Declined</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">{guest.email}</p>
                            </div>
                            <button
                              onClick={() => handleAddGuestToEvent(guest.customerId)}
                              disabled={addingGuest}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {addingGuest ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4" />
                                  {guest.currentStatus === 'PENDING' ? 'Quick Accept' : 
                                   guest.currentStatus === 'DECLINED' ? 'Add Anyway' : 
                                   'Add to Event'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {invitedGuests.length === 0 && availableGuests.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    Loading guest information...
                  </p>
                )}

                {invitedGuests.length === 0 && availableGuests.length > 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No guests have been added to the event yet. Add guests from your booking above.
                  </p>
                )}

                {error && (
                  <p className="text-red-600 text-center mt-4">{error}</p>
                )}
              </div>
            )}
            
            {!isMainGuest && (
              <p className="text-center text-sm text-gray-500 mt-4">
                We look forward to seeing you at the event!
              </p>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  if (invitationData?.status === 'ALREADY_DECLINED') {
    return (
      <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Already Declined</h1>
          <p className="text-gray-600 mb-6">
            You have already declined this invitation.
          </p>
          {event && (
            <div className="text-sm text-gray-500">
              <p>Event: {event.name}</p>
              <p>Date: {formatDate(event.eventDate)}</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-4">
            If you've changed your mind, please contact the hotel reception.
          </p>
        </div>
      </div>
      </>
    );
  }

  // Valid invitation - show details and action buttons
  return (
    <>
    <Header />
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-black to-black/40 via-black/80 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
            <p className="text-white/90">La Torre sulla via Francigena</p>
          </div>

          {/* Event Details */}
          {event && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{event.name}</h2>
                {event.description && (
                  <p className="text-gray-600 mb-6">{event.description}</p>
                )}

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-800">Date</p>
                        <p className="text-gray-600">{formatDate(event.eventDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-800">Time</p>
                        <p className="text-gray-600">{formatTime(event.eventDate)}</p>
                      </div>
                    </div>

                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-800">Location</p>
                          <p className="text-gray-600">{event.location}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {booking && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-2">Your Booking</h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Room: {booking.room.name}</p>
                        <p>Check-in: {formatDate(booking.checkIn)}</p>
                        <p>Check-out: {formatDate(booking.checkOut)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhancements */}
                {event.eventEnhancements && event.eventEnhancements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-600" />
                      Event Includes
                    </h3>
                    <div className="space-y-3">
                      {event.eventEnhancements.map((ee, index) => {
                        const totalPrice = ee.overridePrice || ee.enhancement.price;
                        const tax = ee.enhancement.tax || 0;
                        // Tax is included in the price, calculate how much of it is tax
                        const taxAmount = tax > 0 ? (totalPrice * tax) / (100 + tax) : 0;
                        const subtotal = totalPrice - taxAmount;
                        
                        return (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="flex">
                              {ee.enhancement.image && (
                                <div className="w-24 h-24 flex-shrink-0">
                                  <img 
                                    src={ee.enhancement.image} 
                                    alt={ee.enhancement.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 p-3">
                                <h4 className="font-semibold text-gray-800 text-sm mb-1">{ee.enhancement.name}</h4>
                                {ee.enhancement.description && (
                                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{ee.enhancement.description}</p>
                                )}
                                
                                {/* Price breakdown */}
                                <div className="bg-gray-50 rounded p-2 space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span>€{subtotal.toFixed(2)}</span>
                                  </div>
                                  {tax > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">IVA {tax}%</span>
                                      <span>€{taxAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
                                    <span>Total per person</span>
                                    <span className="text-green-600">€{totalPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 italic mt-1">Taxes included in price</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {invitationData?.status === 'VALID' && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                    Will you be attending?
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => handleResponse('accept')}
                      disabled={processing}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Accept Invitation
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleResponse('decline')}
                      disabled={processing}
                      className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px]"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          Decline
                        </>
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="text-red-600 text-center mt-4">{error}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}