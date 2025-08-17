import type { Customer } from "../../../hooks/useCustomers";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface SummaryStepProps {
  cart: CartItem[];
  customer: Customer | null;
  guestName: string;
  paymentMethod: 'ASSIGN_TO_ROOM' | 'PAY_AT_WAITER' | null;
  selectedPaymentIntent?: any;
}

export default function SummaryStep({ cart, customer, guestName, paymentMethod, selectedPaymentIntent }: SummaryStepProps) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">Order Summary</h3>
      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Customer Info */}
        <div className="pb-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">Customer</h4>
          {customer ? (
            <div>
              <p className="text-gray-900 font-medium">{customer.guestFirstName} {customer.guestLastName}</p>
              <p className="text-sm text-gray-500">{customer.guestEmail}</p>
            </div>
          ) : (
            <p className="text-gray-900 font-medium">Guest: {guestName}</p>
          )}
        </div>

        {/* Payment Method */}
        <div className="py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-700 mb-2">Payment</h4>
          <p className="text-gray-900 font-medium">
            {paymentMethod === 'ASSIGN_TO_ROOM' ? 'Charge to Room' : 'Pay at Waiter'}
          </p>
          {paymentMethod === 'ASSIGN_TO_ROOM' && selectedPaymentIntent && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedPaymentIntent.bookings?.map((booking: any) => (
                <p key={booking.id}>Room: {booking.room?.name || 'Unknown'} (Booking: {selectedPaymentIntent.id.slice(-8)})</p>
              ))}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="py-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">Items</h4>
          <ul className="space-y-4 max-h-64 overflow-y-auto">
            {cart.map(item => (
              <li key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                  <div>
                    <p className="font-semibold text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold text-gray-800">€{(item.price * item.quantity).toFixed(2)}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-xl font-bold text-gray-800">Total</p>
          <p className="text-2xl font-bold text-blue-600">€{total.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
} 