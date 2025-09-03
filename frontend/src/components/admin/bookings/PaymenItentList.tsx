import { Calendar } from "lucide-react"
import type { BookingGroup, PaymentIntent, PaymentIntentsListProps } from "../../../types/types"
import PaymentIntentCard from "./PaymentIntentCard"
import EnhancedPaymentIntentCard from "./EnhancedPaymentIntentCard"

export default function PaymentIntentsList({
  groups,
  paymentIntents,
  loading,
  onViewDetails,
  onSendEmail,
  onCancel,
  onRefund,
  onFutureRefund,
  onViewPayment,
  onEdit,
  onDelete,
  loadingAction,
  selectionMode = false,
  selectedBookingIds = [],
  onBookingSelect = () => {},
  onConfirmBooking,
  onRefresh,
  onRestore,
  isDeletedTab = false,
}: PaymentIntentsListProps & {
  groups: BookingGroup[]
  selectionMode?: boolean;
  selectedBookingIds?: string[];
  onBookingSelect?: (bookingId: string, checked: boolean) => void;
  onRefresh?: () => void;
  onRestore?: (paymentIntent: PaymentIntent) => void;
  isDeletedTab?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex justify-center">
        <span className="ml-2 text-gray-600">Loading bookings...</span>
      </div>
    )
  }
console.log(groups)
  if (paymentIntents.length === 0 && groups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-600">No bookings match your current filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {paymentIntents.map((paymentIntent) => {
        // Check if this payment intent has multiple bookings or if status is SUCCEEDED
        // Use enhanced card for multi-room bookings or successful payments to enable partial refunds
        const shouldUseEnhancedCard = 
          paymentIntent.bookingData.length > 1 || 
          paymentIntent.status === 'SUCCEEDED';

        return shouldUseEnhancedCard ? (
          <EnhancedPaymentIntentCard
            key={paymentIntent.id}
            paymentIntent={paymentIntent}
            onViewDetails={() => onViewDetails(paymentIntent)}
            onSendEmail={() => onSendEmail(paymentIntent.id)}
            onCancel={() => onCancel(paymentIntent)}
            onRefund={() => onRefund(paymentIntent)}
            onFutureRefund={onFutureRefund ? () => onFutureRefund(paymentIntent) : undefined}
            onViewPayment={() =>
              paymentIntent.stripePaymentIntentId && onViewPayment(paymentIntent.stripePaymentIntentId)
            }
            onEdit={() => onEdit(paymentIntent)}
            onDelete={() => onDelete(paymentIntent)}
            onRestore={onRestore ? () => onRestore(paymentIntent) : undefined}
            loadingAction={loadingAction}
            selectionMode={selectionMode}
            selectedBookingIds={selectedBookingIds}
            onBookingSelect={onBookingSelect}
            onConfirmBooking={onConfirmBooking ? () => onConfirmBooking(paymentIntent.id) : undefined}
            onRefresh={onRefresh}
            isDeletedTab={isDeletedTab}
          />
        ) : (
          <PaymentIntentCard
            key={paymentIntent.id}
            paymentIntent={paymentIntent}
            onViewDetails={() => onViewDetails(paymentIntent)}
            onSendEmail={() => onSendEmail(paymentIntent.id)}
            onCancel={() => onCancel(paymentIntent)}
            onRefund={() => onRefund(paymentIntent)}
            onFutureRefund={onFutureRefund ? () => onFutureRefund(paymentIntent) : undefined}
            onViewPayment={() =>
              paymentIntent.stripePaymentIntentId && onViewPayment(paymentIntent.stripePaymentIntentId)
            }
            onEdit={() => onEdit(paymentIntent)}
            onDelete={() => onDelete(paymentIntent)}
            onRestore={onRestore ? () => onRestore(paymentIntent) : undefined}
            loadingAction={loadingAction}
            selectionMode={selectionMode}
            selectedBookingIds={selectedBookingIds}
            onBookingSelect={onBookingSelect}
            onConfirmBooking={onConfirmBooking ? () => onConfirmBooking(paymentIntent.id) : undefined}
            isDeletedTab={isDeletedTab}
          />
        );
      })}
    </div>
  )
}