import { CreditCard, Calendar, ShoppingBag } from 'lucide-react';
import type { Booking } from '../../types/types';

interface OutstandingAmountProps {
    bookings: Booking[];
    isMainGuest: boolean;
}

export const OutstandingAmount = ({ bookings, isMainGuest }: OutstandingAmountProps) => {
    if (!isMainGuest) return null;

    const calculateTotalOutstanding = () => {
        return bookings.reduce((total, booking) => {
            const paymentIntent = booking.paymentIntent;
            if (!paymentIntent) return total;

            let amount = 0;
            
            // Add split payment remaining amount if pending
            if (paymentIntent.paymentStructure === 'SPLIT_PAYMENT' && 
                paymentIntent.secondPaymentStatus !== 'SUCCEEDED' &&
                paymentIntent.secondPaymentStatus !== 'REFUNDED') {
                amount += (paymentIntent.remainingAmount || 0);
            }

            // Add general outstanding amount
            amount += (paymentIntent.outstandingAmount || 0);
            
            return total + amount;
        }, 0);
    };

    // Collect all enhancements from bookings
    const getAllEnhancements = () => {
        const enhancementsMap = new Map();
        
        bookings.forEach(booking => {
            //@ts-ignore
            if (booking?.enhancementBookings && booking?.enhancementBookings.length > 0) {
                //@ts-ignore
                booking?.enhancementBookings?.forEach((eb: any) => {
                    if (!enhancementsMap.has(eb.enhancementId)) {
                        enhancementsMap.set(eb.enhancementId, {
                            id: eb.enhancementId,
                            name: eb.enhancement?.name || 'Enhancement',
                            price: eb.price || 0,
                            quantity: eb.quantity || 1,
                            type: eb.enhancement?.type || 'PRODUCT',
                            bookingId: booking.id,
                            roomName: booking.room?.name || 'Room'
                        });
                    }
                });
            }
        });
        
        return Array.from(enhancementsMap.values());
    };

    const totalOutstanding = calculateTotalOutstanding();
    const enhancements = getAllEnhancements();
    
    // Don't show if no outstanding amount and no enhancements
    if (totalOutstanding === 0 && enhancements.length === 0) return null;
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {/* Outstanding Amount Header */}
            {totalOutstanding > 0 && (
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-gray-600" />
                            <span className="text-lg font-semibold text-gray-900">Outstanding Amount</span>
                        </div>
                        <span className="text-2xl font-bold text-red-600">€{totalOutstanding.toFixed(2)}</span>
                    </div>
                </div>
            )}
            
            {/* Enhancements/Events Section */}
            {enhancements.length > 0 && (
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <ShoppingBag className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">Booked Enhancements</h3>
                    </div>
                    
                    <div className="space-y-2">
                        {enhancements.map((enhancement) => (
                            <div key={enhancement.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-2">
                                    {enhancement.type === 'EVENT' ? (
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                    ) : (
                                        <ShoppingBag className="h-4 w-4 text-green-600" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{enhancement.name}</p>
                                        <p className="text-xs text-gray-500">{enhancement.roomName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">€{enhancement.price.toFixed(2)}</p>
                                    {enhancement.quantity > 1 && (
                                        <p className="text-xs text-gray-500">x{enhancement.quantity}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Total Enhancements Cost */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Total Enhancements</span>
                            <span className="text-sm font-semibold text-gray-900">
                                €{enhancements.reduce((sum, e) => sum + (e.price * e.quantity), 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Total Due Section */}
            {(totalOutstanding > 0 || enhancements.length > 0) && (
                <div className="bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-gray-900">Total Due</span>
                        <span className="text-xl font-bold text-gray-900">
                            €{(totalOutstanding + enhancements.reduce((sum, e) => sum + (e.price * e.quantity), 0)).toFixed(2)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};