import { useEffect, useState } from "react";
import { BsSearch } from "react-icons/bs";
import type { Customer } from "../../../hooks/useCustomers";
import { baseUrl } from "../../../utils/constants";

interface CustomerStepProps {
  onNext: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  temporaryGuestName: string;
  setTemporaryGuestName: (name: string) => void;
}

export default function CustomerStep({ onNext, selectedCustomer, setSelectedCustomer, temporaryGuestName, setTemporaryGuestName }: CustomerStepProps) {
  const [customerType, setCustomerType] = useState<'existing' | 'guest'>('existing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                onClick={() => {
                  setSelectedCustomer(customer);
                  onNext();
                }}
                className={`p-4 cursor-pointer hover:bg-blue-50 border-b border-gray-100 ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-100' : ''
                }`}
              >
                <p className="font-semibold text-gray-800">{customer.guestFirstName} {customer.guestLastName}</p>
                <p className="text-sm text-gray-500">{customer.guestEmail}</p>
              </div>
            ))}
          </div>
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