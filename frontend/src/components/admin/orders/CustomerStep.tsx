import { useEffect, useState } from "react";
import { BsSearch } from "react-icons/bs";
import { baseUrl } from "../../../utils/constants";
import type { Customer } from "../../../hooks/useCustomers";

interface CustomerStepProps {
  onNext: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  temporaryGuestName: string;
  setTemporaryGuestName: (name: string) => void;
  selectedPaymentIntent: any;
  setSelectedPaymentIntent: (paymentIntent: any) => void;
}

export default function CustomerStep({ onNext, selectedCustomer, setSelectedCustomer, temporaryGuestName, setTemporaryGuestName, setSelectedPaymentIntent }: CustomerStepProps) {
  const [customerType, setCustomerType] = useState<'existing' | 'guest'>('existing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookingSelection, setShowBookingSelection] = useState(false);

  useEffect(() => {
    if (customerType === 'existing') {
      fetch(`${baseUrl}/admin/customers/all`, {
        method: "GET",
        credentials: "include"
      })
        .then(res => res.json())
        .then(data => setCustomers(data.data));
    }
  }, [customerType]);

  const filteredCustomers = customers.filter(c => 
    `${c.guestFirstName} ${c.guestLastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.guestEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Customer Type Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-200 rounded-lg p-1 flex">
          <button
            onClick={() => setCustomerType('existing')}
            className={`px-6 py-2 rounded-md font-semibold text-sm transition-all ${
              customerType === 'existing' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
            }`}
          >
            Existing Customer
          </button>
          <button
            onClick={() => setCustomerType('guest')}
            className={`px-6 py-2 rounded-md font-semibold text-sm transition-all ${
              customerType === 'guest' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
            }`}
          >
            New Guest
          </button>
        </div>
      </div>

      {customerType === 'existing' ? (
        <div>
          <div className="relative mb-4">
            <BsSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 max-h-80 overflow-y-auto">
            {filteredCustomers.map((customer: Customer) => (
              <div
                key={customer.id}
                onClick={() => {
                  setSelectedCustomer(customer);
                  // Check if customer has active payment intents
                  if (customer.paymentIntents && customer.paymentIntents.length > 0) {
                    setShowBookingSelection(true);
                  } else {
                    onNext();
                  }
                }}
                className={`p-4 cursor-pointer hover:bg-blue-50 border-b border-gray-100 ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-100' : ''
                }`}
              >
                <p className="font-semibold text-gray-800">{customer.guestFirstName} {customer.guestLastName}</p>
                <p className="text-sm text-gray-500">{customer.guestEmail}</p>
                {customer.paymentIntents && customer.paymentIntents.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">{customer.paymentIntents.length} active booking(s)</p>
                )}
              </div>
            ))}
          </div>
          
          {/* Booking Selection Modal */}
          {showBookingSelection && selectedCustomer && selectedCustomer.paymentIntents && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Select Booking for Room Charge</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This customer has multiple active bookings. Please select which booking to assign the order to:
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCustomer.paymentIntents.map((pi: any) => (
                    <div
                      key={pi.id}
                      onClick={() => {
                        setSelectedPaymentIntent(pi);
                        setShowBookingSelection(false);
                        onNext();
                      }}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                    >
                      {pi.bookings.map((booking: any) => (
                        <div key={booking.id}>
                          <p className="font-semibold">{booking.room?.name || 'Unknown Room'}</p>
                          <p className="text-sm text-gray-600">
                            Booking ID: {pi.id.slice(-8)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowBookingSelection(false);
                    setSelectedCustomer(null);
                  }}
                  className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
            <input
              type="text"
              placeholder="Enter guest surname"
              value={temporaryGuestName}
              onChange={e => setTemporaryGuestName(e.target.value)}
              className="w-full max-w-sm mx-auto px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
            />
             <button
              onClick={onNext}
              disabled={!temporaryGuestName}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm Guest
            </button>
        </div>
      )}
    </div>
  );
} 