import React, { useState } from "react";
import { X } from "lucide-react";
import { useCustomers } from "../../../hooks/useCustomers";
import type { Customer } from "../../../hooks/useCustomers";

interface SelectCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}

const SelectCustomerModal: React.FC<SelectCustomerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { customers, loading } = useCustomers();
  const [search, setSearch] = useState("");

  // Only show modal if open
  if (!isOpen) return null;

  const filtered = customers.filter(
    (c) =>
      c.guestFirstName.toLowerCase().includes(search.toLowerCase()) ||
      c.guestLastName.toLowerCase().includes(search.toLowerCase()) ||
      c.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
      c.guestPhone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4">Select Existing Customer</h2>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nationality</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8">No customers found.</td></tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{customer.guestFirstName} {customer.guestLastName}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{customer.guestEmail}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{customer.guestPhone}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{customer.guestNationality || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => { onSelect(customer); onClose(); }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SelectCustomerModal; 