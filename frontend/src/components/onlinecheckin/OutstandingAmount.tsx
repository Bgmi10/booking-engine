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

    const totalOutstanding = calculateTotalOutstanding();
    
    // Don't show if no outstanding amount
    if (totalOutstanding === 0) return null;
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Outstanding Amount</span>
                <span className="text-2xl font-bold text-gray-900">€{totalOutstanding.toFixed(2)}</span>
            </div>
        </div>
    );
};