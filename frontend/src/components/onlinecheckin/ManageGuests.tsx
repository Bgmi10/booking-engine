import React, { useState } from "react"
import { X, Plus, ChevronLeft, ChevronDown, Trash2, Check, Mail, User, Copy } from "lucide-react"
import toast from 'react-hot-toast'
import { baseUrl } from "../../utils/constants"
import { useOnlineCheckIn } from "../../context/OnlineCheckInContext"
import Header from "../Header"
import { GuestModal } from "./GuestModal"

export const ManageGuests: React.FC = () => {
    const { customer, primaryBookingId } = useOnlineCheckIn()   
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set())
    const [showApplyToAll, setShowApplyToAll] = useState(false)
    const [lastAddedGuest, setLastAddedGuest] = useState<any>(null)
    console.log(lastAddedGuest)
    const [guestModal, setGuestModal] = useState<{
        isOpen: boolean;
        bookingId: string;
        roomName: string;
    }>({
        isOpen: false,
        bookingId: '',
        roomName: ''
    })
    
    if (!customer) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Unable to load guest management</p>
                </div>
            </div>
        )
    }

    const bookings = customer.bookings || []
    const guestData = customer.customer
    
    // Separate primary booking from other bookings
    const primaryBooking = primaryBookingId ? bookings.find(b => b.id === primaryBookingId) : bookings[0]
    const otherBookings = bookings.filter(b => b.id !== (primaryBooking?.id))
    
    const toggleBookingExpansion = (bookingId: string) => {
        setExpandedBookings(prev => {
            const newSet = new Set(prev)
            if (newSet.has(bookingId)) {
                newSet.delete(bookingId)
            } else {
                newSet.add(bookingId)
            }
            return newSet
        })
    }
    
    const openGuestModal = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId)
        setGuestModal({
            isOpen: true,
            bookingId,
            roomName: booking?.room?.name || `Room ${bookingId.slice(-4)}`
        })
    }
    
    const closeGuestModal = () => {
        setGuestModal({
            isOpen: false,
            bookingId: '',
            roomName: ''
        })
        
        // After adding a guest to primary booking, show option to apply to all
        if (guestModal.bookingId === primaryBooking?.id && otherBookings.length > 0) {
            setShowApplyToAll(true)
        }
    }
    
    const handleDeleteGuest = async (bookingId: string, guestId: string, guestName: string) => {
        if (!confirm(`Are you sure you want to remove ${guestName} from this booking?`)) {
            return
        }
        
        try {
            const response = await fetch(`${baseUrl}/customers/online-checkin/bookings/${bookingId}/guests/${guestId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                toast.success('Guest removed successfully')
                window.location.reload()
            } else {
                const data = await response.json()
                toast.error(data.message || 'Failed to remove guest')
            }
        } catch (error) {
            console.error('Error removing guest:', error)
            toast.error('Failed to remove guest. Please try again.')
        }
    }
    
    const applyGuestToAllBookings = async () => {
        if (!lastAddedGuest) return
        
        setIsSubmitting(true)
        try {
            const response = await fetch(`${baseUrl}/customers/online-checkin/apply-guest-to-all`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guestData: lastAddedGuest,
                    excludeBookingId: primaryBooking?.id
                })
            })
            
            if (response.ok) {
                toast.success('Guest added to all bookings')
            } else {
                const data = await response.json()
                toast.error(data.message || 'Failed to apply guest to all bookings')
            }
        } catch (error) {
            console.error('Error applying guest to all:', error)
            toast.error('Failed to apply guest to all bookings')
        } finally {
            setIsSubmitting(false)
            setShowApplyToAll(false)
        }
    }
    
    const handleBack = () => {
        window.history.back()
    }

    const handleClose = () => {
        window.location.href = '/online-checkin/home'
    }

    const handleContinue = () => {
        window.location.href = '/online-checkin/home'
    }
    
    // Component for rendering guest list
    const GuestList = ({ booking, canDelete = true }: { booking: any, canDelete?: boolean }) => {
        const allGuests = booking.guests || []
        const bookingGuests = allGuests.filter(guest => 
            guest.guestType !== 'MAIN_GUEST' && !guest.isMainGuest
        )
        const maxGuests = booking.totalGuests
        const isPrimaryBooking = booking.id === primaryBooking?.id
        const availableSlots = isPrimaryBooking ? maxGuests - 1 : maxGuests
        const canAddMore = bookingGuests.length < availableSlots
        
        return (
            <div className="space-y-3">
                {bookingGuests.length === 0 && (
                    <div className="text-sm text-gray-500 italic py-2">
                        No additional guests added yet
                    </div>
                )}
                {bookingGuests.map((guest, guestIndex) => {
                    const completionFields = [
                        guest.personalDetailsComplete,
                        guest.identityDetailsComplete,
                        guest.addressDetailsComplete
                    ];
                    const completedCount = completionFields.filter(Boolean).length;
                    const completionPercentage = Math.round((completedCount / completionFields.length) * 100);
                    
                    const guestStatus = guest.guestType === 'MANUAL' ? 'Added manually' : 
                                      guest.invitationStatus === 'ACCEPTED' ? 'Accepted invitation' :
                                      guest.invitationStatus === 'PENDING' ? 'Invitation pending' : 'Guest';
                    const statusColor = guest.invitationStatus === 'PENDING' ? 'text-yellow-600' : 
                                      guest.invitationStatus === 'ACCEPTED' ? 'text-green-600' : 
                                      'text-gray-600';
                    const statusIcon = guest.guestType === 'MANUAL' ? <User className="w-3 h-3" /> : 
                                     guest.invitationStatus === 'PENDING' ? <Mail className="w-3 h-3" /> : 
                                     <Check className="w-3 h-3" />;
                    
                    return (
                        <div key={guest.id || guestIndex} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-medium text-gray-700">
                                            {guest.guestFirstName?.charAt(0)}{guest.guestLastName?.charAt(0)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {guest.guestFirstName} {guest.guestLastName}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={`${statusColor} flex items-center gap-1 text-xs`}>
                                                {statusIcon}
                                                {guestStatus}
                                            </span>
                                            <span className="text-gray-400 text-xs">•</span>
                                            <span className={`text-xs ${completionPercentage === 100 ? 'text-green-600' : 'text-gray-600'}`}>
                                                {completionPercentage === 100 ? (
                                                    <span className="flex items-center gap-1">
                                                        <Check className="w-3 h-3" />
                                                        Complete
                                                    </span>
                                                ) : (
                                                    `${completionPercentage}% complete`
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {canDelete && (
                                    <button 
                                        onClick={() => handleDeleteGuest(booking.id, guest.id, `${guest.guestFirstName} ${guest.guestLastName}`)}
                                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                                        title="Remove guest"
                                    >
                                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {canAddMore && (
                    <button
                        onClick={() => openGuestModal(booking.id)}
                        className="w-full bg-gray-50 rounded-xl p-4 text-left hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium">
                                Add guest ({availableSlots - bookingGuests.length} remaining)
                            </span>
                            <div className="w-8 h-8 border-2 border-gray-400 rounded-lg flex items-center justify-center">
                                <Plus className="w-4 h-4 text-gray-600" />
                            </div>
                        </div>
                    </button>
                )}
            </div>
        )
    }

    return (
        <>
        <Header />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            
            {/* Modal Container */}
            <div className="w-full max-w-4xl lg:max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={handleBack}
                            className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        
                        <h1 className="text-xl font-semibold text-gray-900">Add guests</h1>
                        
                        <button 
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex">
                    {/* Left Side - Guest Management */}
                    <div className="flex-1 p-6 lg:p-8">
                        {/* Main Guest Card */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            {guestData.firstName.charAt(0)}{guestData.lastName.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {guestData.firstName} {guestData.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500">Reservation owner</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Primary Booking - Prominent Display */}
                        {primaryBooking && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Current Check-in</h2>
                                    <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                        {new Date(primaryBooking.checkIn).toLocaleDateString()} - {new Date(primaryBooking.checkOut).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="border border-gray-200 rounded-xl p-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {primaryBooking.room?.name || `Room ${primaryBooking.id.slice(-4)}`}
                                            <span className="text-sm text-blue-600 ml-2">(Main Guest's Room)</span>
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Max {primaryBooking.totalGuests} guests (1 main guest + {primaryBooking.totalGuests - 1} additional)
                                        </p>
                                    </div>
                                    <GuestList booking={primaryBooking} />
                                </div>
                            </div>
                        )}

                        {/* Apply to All Banner */}
                        {showApplyToAll && (
                            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Copy className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-900">
                                            Would you like to add this guest to your other bookings?
                                        </p>
                                        <p className="text-sm text-blue-700 mt-1">
                                            The same guest information will be applied to all your upcoming bookings.
                                        </p>
                                        <div className="flex gap-3 mt-3">
                                            <button
                                                onClick={applyGuestToAllBookings}
                                                disabled={isSubmitting}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {isSubmitting ? 'Applying...' : 'Yes, add to all'}
                                            </button>
                                            <button
                                                onClick={() => setShowApplyToAll(false)}
                                                className="px-4 py-2 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                                            >
                                                No, thanks
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Other Bookings - Collapsible */}
                        {otherBookings.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Upcoming Stays</h2>
                                <div className="space-y-3">
                                    {otherBookings.map((booking) => {
                                        const isExpanded = expandedBookings.has(booking.id)
                                        const allGuests = booking.guests || []
                                        const bookingGuests = allGuests.filter(guest => 
                                            guest.guestType !== 'MAIN_GUEST' && !guest.isMainGuest
                                        )
                                        
                                        return (
                                            <div key={booking.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <button 
                                                    onClick={() => toggleBookingExpansion(booking.id)}
                                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="text-left">
                                                        <p className="font-medium text-gray-900">
                                                            {booking.room?.name || `Room ${booking.id.slice(-4)}`}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()} • 
                                                            {bookingGuests.length}/{booking.totalGuests} guests
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {bookingGuests.length === 0 && (
                                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">No guests yet</span>
                                                        )}
                                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </button>
                                                
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 border-t border-gray-100">
                                                        <div className="mt-4">
                                                            <GuestList booking={booking} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Continue Button */}
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleContinue}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Guest Modal */}
        <GuestModal 
            isOpen={guestModal.isOpen}
            onClose={closeGuestModal}
            bookingId={guestModal.bookingId}
            roomName={guestModal.roomName}
            onGuestAdded={(guestData) => {
                setLastAddedGuest(guestData)
                closeGuestModal()
            }}
        />
        </>
    )
}