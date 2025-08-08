import { X } from "lucide-react";
import { useState } from "react";
import { baseUrl } from "../../../utils/constants";
import countryList from "country-list-with-dial-code-and-flag";
import { RiErrorWarningLine, RiCheckLine } from "react-icons/ri";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, isValid } from 'date-fns';

interface CreateCustomerModalProps {
  setIsCreateModalOpen: (open: boolean) => void;
  fetchCustomers: () => void;
}

export function CreateCustomerModal({ setIsCreateModalOpen, fetchCustomers }: CreateCustomerModalProps) {
  const countries = countryList.getAll();
  const [loading, setLoading] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phone: "",
    nationality: "",
    dob: "",
    passportNumber: "",
    passportExpiry: "",
    anniversaryDate: "",
    vipStatus: false,
    totalNigthsStayed: 0,
    totalMoneySpent: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError("");
    try {
      // Transform empty strings to null before sending
      const submitData = {
        ...formData,
        dob: formData.dob || null,
        passportExpiry: formData.passportExpiry || null,
        anniversaryDate: formData.anniversaryDate || null,
        middleName: formData.middleName || null,
        nationality: formData.nationality || null,
        passportNumber: formData.passportNumber || null
      };

      const response = await fetch(`${baseUrl}/admin/customers`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      if (response.ok) {
        setLocalSuccess("Customer created successfully!");
        setTimeout(() => {
          fetchCustomers();
          setIsCreateModalOpen(false);
        }, 500);
      } else {
        setLocalError(data.message || "Failed to create customer");
      }
    } catch (error) {
      setLocalError("Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) || 0 : 
              value
    }));
  };

  const handleNationalityChange = (code: string) => {
    const country = countries.find(c => c.code === code);
    if (country) {
      setSelectedCountryCode(code);
      setFormData(prev => ({
        ...prev,
        nationality: country.name,
        phone: !prev.phone || prev.phone.startsWith('+') ? country.dial_code : prev.phone
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={() => setIsCreateModalOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Create New Customer</h2>

        {localError && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <RiErrorWarningLine className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{localError}</p>
              </div>
            </div>
          </div>
        )}

        {localSuccess && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <RiCheckLine className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{localSuccess}</p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nationality
              </label>
              <select
                value={selectedCountryCode}
                onChange={(e) => handleNationalityChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              >
                <option value="">Select nationality</option>
                {countries.map((country, index) => (
                  <option key={index} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <div className="flex">
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={selectedCountryCode ? countries.find(c => c.code === selectedCountryCode)?.dial_code : "Enter phone number"}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              {selectedCountryCode && (
                <p className="mt-1 text-xs text-gray-500">
                  Country code: {countries.find(c => c.code === selectedCountryCode)?.dial_code}
                </p>
              )}
            </div>

            {/* Additional Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <DatePicker
                selected={formData.dob ? new Date(formData.dob) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    setFormData({ ...formData, dob: date.toISOString().split('T')[0] });
                  }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date of birth"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passport Number
              </label>
              <input
                type="text"
                name="passportNumber"
                value={formData.passportNumber}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passport Expiry
              </label>
              <DatePicker
                selected={formData.passportExpiry ? new Date(formData.passportExpiry) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    setFormData({ ...formData, passportExpiry: date.toISOString().split('T')[0] });
                  }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select passport expiry date"
                disabled={loading}
                minDate={new Date()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anniversary Date
              </label>
              <DatePicker
                selected={formData.anniversaryDate ? new Date(formData.anniversaryDate) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    setFormData({ ...formData, anniversaryDate: date.toISOString().split('T')[0] });
                  }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select anniversary date"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 mr-3">
                VIP Status
              </label>
              <input
                type="checkbox"
                name="vipStatus"
                checked={formData.vipStatus}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 