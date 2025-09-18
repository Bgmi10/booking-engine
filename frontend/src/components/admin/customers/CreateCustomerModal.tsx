import { X } from "lucide-react";
import { useState } from "react";
import { baseUrl } from "../../../utils/constants";
import countryList from "country-list-with-dial-code-and-flag";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"
import toast from "react-hot-toast";

interface CreateCustomerModalProps {
  setIsCreateModalOpen: (open: boolean) => void;
  fetchCustomers: () => void;
}

export function CreateCustomerModal({ setIsCreateModalOpen, fetchCustomers }: CreateCustomerModalProps) {
  const countries = countryList.getAll();
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState<'passport' | 'idCard'>('passport');
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
    totalMoneySpent: 0,
    passportIssuedCountry: "",
    idCard: "",
    gender: "MALE",
    placeOfBirth: "",
    city: "",
    carNumberPlate: "",
    tcAgreed: true,
    receiveMarketingEmail: true,
    adminNotes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Transform empty strings to null before sending
      const submitData = {
        ...formData,
        dob: formData.dob || null,
        passportExpiry: documentType === 'passport' ? (formData.passportExpiry || null) : null,
        anniversaryDate: formData.anniversaryDate || null,
        middleName: formData.middleName || null,
        nationality: formData.nationality || null,
        passportNumber: documentType === 'passport' ? (formData.passportNumber || null) : null,
        passportIssuedCountry: documentType === 'passport' ? (formData.passportIssuedCountry || null) : null,
        idCard: documentType === 'idCard' ? (formData.idCard || null) : null,
        placeOfBirth: formData.placeOfBirth || null,
        city: formData.city || null,
        carNumberPlate: formData.carNumberPlate || null
      };

      const response = await fetch(`${baseUrl}/admin/customers`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
          toast.success("Created Successfully")
          fetchCustomers();
          setIsCreateModalOpen(false);
      } else {
        toast.error("Failed to create try again later")
      }
    } catch (error) {
      toast.error("Failed to create try again later")
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

  const handleNationalityChange = (countryName: string) => {
    const country = countries.find(c => c.name === countryName);
    if (country) {
      setFormData(prev => ({
        ...prev,
        nationality: countryName,
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
                value={formData.nationality}
                onChange={(e) => handleNationalityChange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              >
                <option value="">Select nationality</option>
                {countries.map((country, index) => (
                  <option key={index} value={country.name}>
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
                  placeholder={formData.nationality ? countries.find(c => c.name === formData.nationality)?.dial_code : "Enter phone number"}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              {formData.nationality && (
                <p className="mt-1 text-xs text-gray-500">
                  Country code: {countries.find(c => c.name === formData.nationality)?.dial_code}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place Of Birth
              </label>
              <input
                type="text"
                name="placeOfBirth"
                value={formData.placeOfBirth}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
               Car License Plate
              </label>
              <input
                type="text"
                name="carNumberPlate"
                value={formData.carNumberPlate}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              />
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
                Gender
              </label>
             <select name="gender" id="" onChange={(e) => handleChange(e)} value={formData.gender} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
               <option value="MALE">Male</option>
               <option value="FEMALE">Female</option>
             </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDocumentType('passport')}
                  className={`px-3 py-2 border rounded-md text-sm font-medium transition-all ${
                    documentType === 'passport'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  Passport
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType('idCard')}
                  className={`px-3 py-2 border rounded-md text-sm font-medium transition-all ${
                    documentType === 'idCard'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  ID Card
                </button>
              </div>
            </div>

            {documentType === 'idCard' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Card Number
                </label>
                <input
                  type="text"
                  name="idCard"
                  value={formData.idCard}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={loading}
                  maxLength={30}
                />
              </div>
            ) : (
              <>
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
                Passport Issued Country 
              </label>
              <select
                value={formData.passportIssuedCountry}
                name="passportIssuedCountry"
                onChange={(e) => handleChange(e)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={loading}
              >
                <option value="">Select country</option>
                {countries.map((country, index) => (
                  <option key={index} value={country.name}>
                      {country.name}
                  </option>
                ))}
              </select>
            </div>
              </>
            )}

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
            
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 mr-3">
                Terms & Condition
              </label>
              <input
                type="checkbox"
                name="tcAgreed"
                checked={formData.tcAgreed}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={loading}
              />
            </div>
            
            <div className="flex items-center">
              <label className="text-sm font-medium text-gray-700 mr-3">
                Marketing Email
              </label>
              <input
                type="checkbox"
                name="receiveMarketingEmail"
                checked={formData.receiveMarketingEmail}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={loading}  
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes
            </label>
            <textarea
              name="adminNotes"
              value={formData.adminNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
              rows={4}
              placeholder="Internal notes for administrative use..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-vertical"
              disabled={loading}
            />
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