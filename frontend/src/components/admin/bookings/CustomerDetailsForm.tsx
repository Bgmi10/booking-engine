import React from "react";
import type { CustomerDetails } from "../../../types/types";

interface Country {
  code: string;
  name: string;
  flag: string;
  dial_code: string;
}

interface CustomerDetailsFormProps {
  customerDetails: CustomerDetails;
  setCustomerDetails: React.Dispatch<React.SetStateAction<CustomerDetails>>;
  countries: Country[];
  loadingAction: boolean;
  handleNationalityChange: (countryCode: string) => void;
}

const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  customerDetails,
  setCustomerDetails,
  countries,
  loadingAction,
  handleNationalityChange,
}) => {
  return (
    <div className="mb-8">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input
            type="text"
            value={customerDetails.firstName}
            onChange={(e) => setCustomerDetails((prev) => ({ ...prev, firstName: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
          <input
            type="text"
            value={customerDetails.middleName}
            onChange={(e) => setCustomerDetails((prev) => ({ ...prev, middleName: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            type="text"
            value={customerDetails.lastName}
            onChange={(e) => setCustomerDetails((prev) => ({ ...prev, lastName: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={customerDetails.email}
            onChange={(e) => setCustomerDetails((prev) => ({ ...prev, email: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
          <select
            value={customerDetails.nationality}
            onChange={(e) => handleNationalityChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          >
            <option value="">Select nationality</option>
            {countries.map((country, index) => (
              <option key={index} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={customerDetails.phone}
            onChange={(e) => setCustomerDetails((prev) => ({ ...prev, phone: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={customerDetails.specialRequests}
            onChange={(e) => setCustomerDetails((prev) => ({ ...prev, specialRequests: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            rows={3}
            disabled={loadingAction}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsForm; 