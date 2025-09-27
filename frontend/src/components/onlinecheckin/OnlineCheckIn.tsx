import { useOnlineCheckIn } from "../../context/OnlineCheckInContext"
import { useOnlineCheckInEnhancements } from "../../hooks/useEnhancements"
import { OnlineCheckInForm } from "./OnlineCheckInForm"
import { OutstandingAmount } from "./OutstandingAmount"
import { EnhancementsSection } from "./EnhancementsSection"
import Header from "../Header"
import Loader from "../Loader"
import type { Booking } from "../../types/types"

export const OnlineCheckIn = () => {
    const { customer, loader } = useOnlineCheckIn();
    
    // Get primary booking for enhancement calculations
    const bookings = customer?.bookings || [];
    const primaryBooking = bookings.find((b: Booking) => b.id === customer?.primaryBookingId) || bookings[0];
    
    // Use enhancement hook at parent level
    const enhancementState = useOnlineCheckInEnhancements(
        customer?.availableEnhancements || [],
        primaryBooking ? {
            checkIn: primaryBooking.checkIn,
            checkOut: primaryBooking.checkOut
        } : undefined
    );
    
    if (loader) {
        return <Loader />
    }

    if (!customer) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                            Unable to load check-in information
                        </h1>
                        <p className="text-gray-600">
                            Please contact reception for assistance.
                        </p>
                    </div>
                </div>
            </>
        )
    }


    return (
        <div className="min-h-screen bg-gray-50">
         
            {/* Content Container */}
            <div className="relative z-10"> 
                <Header />  
                
                <div className="px-6 pb-6 mt-8">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        
                        <div className="p-6">
                        
                            <OutstandingAmount 
                                bookings={customer.bookings || []} 
                                isMainGuest={customer.isMainGuest || false} 
                            />
                        
                            {primaryBooking && (
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-100 rounded-xl p-4">
                                        <p className="text-gray-600 text-sm mb-1">Check-in</p>
                                        <p className="font-medium text-gray-900">
                                            {new Date(primaryBooking.checkIn).toLocaleDateString('en-US', { 
                                                weekday: 'short',
                                                month: 'short', 
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className="bg-gray-100 rounded-xl p-4">
                                        <p className="text-gray-600 text-sm mb-1">Check out</p>
                                        <p className="font-medium text-gray-900">
                                            {new Date(primaryBooking.checkOut).toLocaleDateString('en-US', { 
                                                weekday: 'short',
                                                month: 'short', 
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Room Summary */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Your Reservation</p>
                                        <p className="text-xs text-gray-600">
                                            {bookings.length} Room{bookings.length > 1 ? 's' : ''} • {' '}
                                            {bookings.reduce((total: any, booking: any) => total + booking.totalGuests, 0)} Guest{bookings.reduce((total: any, booking: any) => total + booking.totalGuests, 0) > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                            Confirmed
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Outstanding Amount Section - Only for main guests */}
                      
                        {/* Enhancements Section - Only for main guests */}
                        <div className="px-6">

                            <EnhancementsSection 
                                isMainGuest={customer.isMainGuest || false}
                                totalGuests={primaryBooking?.totalGuests || 1}
                                enhancementState={enhancementState}
                            />
                        </div>
                        
                        <div className="px-6">
                            <OnlineCheckInForm 
                                customer={customer} 
                                selectedEnhancements={enhancementState.selectedEnhancements}
                                primaryBooking={primaryBooking}
                            />
                        </div>
                    </div>
                </div>

            
            </div>
        </div>
    )
}