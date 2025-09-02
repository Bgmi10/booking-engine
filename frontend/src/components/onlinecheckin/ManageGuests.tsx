import React, { useState, useEffect } from "react"
import { X, Plus, ChevronLeft, Trash2, Check, Mail, User, AlertCircle } from "lucide-react"
import toast from 'react-hot-toast'
import { baseUrl } from "../../utils/constants"
import { useOnlineCheckIn } from "../../context/OnlineCheckInContext"
import { useGeneralSettings } from "../../hooks/useGeneralSettings"
import Header from "../Header"
import { GuestModal } from "./GuestModal"

export const ManageGuests: React.FC = () => {
    const { customer } = useOnlineCheckIn()
    const { settings } = useGeneralSettings()
    // Guest management state - now using data from context instead of separate API calls
    const [isSubmitting, setIsSubmitting] = useState(false)
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
    
    // No longer need to load guests separately - they're included in the bookings data from context
    
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
    }
    
    const handleGuestAdded = (guestData: any) => {
        // Refresh the entire context data to get updated guest information
        window.location.reload()
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
                }
            })

            if (response.ok) {
                toast.success('Guest removed successfully')
                // Refresh the page to get updated guest data
                window.location.reload()
            } else {
                const data = await response.json()
                toast.error(data.message || 'Failed to remove guest')
            }
        } catch (error) {
            console.error('Error deleting guest:', error)
            toast.error('Failed to remove guest')
        }
    }
    
    const handleSubmit = async () => {
        // Simply redirect to success page since guests are managed individually now
        window.location.href = '/online-checkin/success'
    }
    
    const handleBack = () => {
        window.location.href = '/online-checkin'
    }
    
    const handleClose = () => {
        window.location.href = '/online-checkin/home'
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
                        {/* Booking Info */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-medium text-gray-900 mb-2">
                                {bookings.length > 1 ? 
                                    `Multiple Bookings (${bookings.length} rooms)` : 
                                    bookings[0]?.room?.name || 'Private Booking'
                                }
                            </h2>
                        </div>

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

                        {/* Per-Booking Guest Management */}
                        <div className="space-y-8">
                            {bookings.map((booking, index) => {
                                // Filter out the main guest from the guest list
                                const allGuests = booking.guests || []
                                const bookingGuests = allGuests.filter(guest => 
                                    guest.guestType !== 'MAIN_GUEST' && !guest.isMainGuest
                                )
                                const maxGuests = booking.totalGuests
                                const isFirstBooking = index === 0
                                // For first booking, account for main guest occupying one slot
                                const availableSlots = isFirstBooking ? maxGuests - 1 : maxGuests
                                const canAddMore = bookingGuests.length < availableSlots
                                
                                return (
                                    <div key={booking.id} className="border border-gray-200 rounded-xl p-6">
                                        {/* Booking Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {booking.room?.name || `Room ${booking.id.slice(-4)}`}
                                                    {isFirstBooking && <span className="text-sm text-blue-600 ml-2">(Main Guest's Room)</span>}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    Max {maxGuests} guests {isFirstBooking ? '(1 main guest + ' + availableSlots + ' additional)' : ''} • {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Existing Guests (excluding main guest) */}
                                        <div className="space-y-3">
                                            {bookingGuests.length === 0 && (
                                                <div className="text-sm text-gray-500 italic py-2">
                                                    No additional guests added yet
                                                </div>
                                            )}
                                            {bookingGuests.map((guest, guestIndex) => {
                                                // Calculate completion percentage
                                                const completionFields = [
                                                    guest.personalDetailsComplete,
                                                    guest.identityDetailsComplete,
                                                    guest.addressDetailsComplete
                                                ];
                                                const completedCount = completionFields.filter(Boolean).length;
                                                const completionPercentage = Math.round((completedCount / completionFields.length) * 100);
                                                
                                                return (
                                                    <div key={guest.id} className="bg-gray-50 rounded-xl p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-gray-700">
                                                                        {guest.guestFirstName?.charAt(0)}{guest.guestLastName?.charAt(0)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900">
                                                                        {guest.guestFirstName} {guest.guestLastName}
                                                                    </p>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                                                            {guest.guestType === 'MANUAL' ? (
                                                                                <>
                                                                                    <User className="w-4 h-4" />
                                                                                    Details completed manually
                                                                                </>
                                                                            ) : guest.invitationStatus === 'PENDING' ? (
                                                                                <>
                                                                                    <Mail className="w-4 h-4" />
                                                                                    Invitation sent
                                                                                </>
                                                                            ) : guest.invitationStatus === 'ACCEPTED' ? (
                                                                                <>
                                                                                    <Check className="w-4 h-4 text-blue-600" />
                                                                                    Accepted invitation
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Check className="w-4 h-4 text-green-600" />
                                                                                    Completed check-in
                                                                                </>
                                                                            )}
                                                                        </p>
                                                                        {guest.completionStatus !== 'COMPLETE' && (
                                                                            <span className="text-xs text-gray-400">
                                                                                • {completionPercentage}% complete
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* Completion details */}
                                                                    {guest.completionStatus !== 'COMPLETE' && (
                                                                        <div className="flex items-center gap-1 mt-1">
                                                                            {!guest.personalDetailsComplete && (
                                                                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                                                                                    Personal
                                                                                </span>
                                                                            )}
                                                                            {!guest.identityDetailsComplete && (
                                                                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                                                                                    Identity
                                                                                </span>
                                                                            )}
                                                                            {!guest.addressDetailsComplete && (
                                                                                <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                                                                                    Address
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-sm">
                                                                    {guest.completionStatus === 'COMPLETE' ? (
                                                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                                            Complete
                                                                        </span>
                                                                    ) : guest.completionStatus === 'PARTIAL' ? (
                                                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                                                            Partial
                                                                        </span>
                                                                    ) : guest.invitationStatus === 'PENDING' ? (
                                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                                            Pending
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                                                                            <AlertCircle className="w-3 h-3" />
                                                                            Incomplete
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Delete button */}
                                                                <button
                                                                    onClick={() => handleDeleteGuest(booking.id, guest.id, `${guest.guestFirstName} ${guest.guestLastName}`)}
                                                                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                                                                    title="Remove guest"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Add Guest Button */}
                                            {canAddMore && (
                                                <button
                                                    onClick={() => openGuestModal(booking.id)}
                                                    className="w-full bg-gray-50 rounded-xl p-4 text-left hover:bg-gray-100 transition-colors border-2 border-dashed border-gray-300"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-700 font-medium">
                                                            Add guest to {booking.room?.name || 'this room'} ({availableSlots - bookingGuests.length} remaining)
                                                        </span>
                                                        <div className="w-8 h-8 border-2 border-gray-400 rounded-lg flex items-center justify-center">
                                                            <Plus className="w-4 h-4 text-gray-600" />
                                                        </div>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Continue Button */}
                        <div className="mt-8">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Sending invitations...
                                    </div>
                                ) : (
                                    'Continue'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Side - Property Image (Desktop Only) */}
                    <div className="hidden lg:block w-96 relative mt-9 mr-4">
                        {settings?.onlineCheckinHomeImageUrl ? (
                            <img 
                                src={settings.onlineCheckinHomeImageUrl}
                                alt="La Torre"
                                className="h-1/2 rounded-3xl w-92 object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200">
                                {/* Fallback gradient if no image */}
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-green-700 text-center px-8">
                                        Beautiful vineyard views await you at La Torre
                                    </p>
                                </div>
                            </div>
                        )}
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
            onGuestAdded={handleGuestAdded}
        />
        </>
    )
}