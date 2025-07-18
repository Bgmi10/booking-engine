import React, { useState, useEffect } from 'react';
import { baseUrl } from '../../../utils/constants';
import type { WeddingProposal } from '../../../types/types';
import toast from 'react-hot-toast';
import type { Customer } from '../../../hooks/useCustomers';

type ProposalFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proposal: any) => void;
  proposalToEdit: WeddingProposal | null;
  loading: boolean;
};

const ProposalFormModal: React.FC<ProposalFormModalProps> = ({
  isOpen,
  onSave,
  proposalToEdit,
  loading,
}) => {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    weddingDate: '',
    mainGuestCount: 2,
    termsAndConditions: '',
    itineraryDays: [] as any[],
  });
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch customers for selection
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (proposalToEdit) {
        setFormData({
          name: proposalToEdit.name,
          customerId: proposalToEdit.customerId,
          weddingDate: proposalToEdit.weddingDate.split('T')[0], // Format to YYYY-MM-DD
          mainGuestCount: proposalToEdit.mainGuestCount,
          termsAndConditions: proposalToEdit.termsAndConditions || '',
          itineraryDays: proposalToEdit.itineraryDays,
        });
        setStep(1);
      } else {
        // Set defaults for new proposal
        const today = new Date();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(today.getFullYear() + 1);
        
        setFormData({
          name: '',
          customerId: '',
          weddingDate: oneYearFromNow.toISOString().split('T')[0],
          mainGuestCount: 2,
          termsAndConditions: '',
          itineraryDays: [
            {
              dayNumber: 1,
              date: oneYearFromNow.toISOString().split('T')[0],
              items: []
            },
            {
              dayNumber: 2,
              date: new Date(oneYearFromNow.setDate(oneYearFromNow.getDate() + 1))
                .toISOString().split('T')[0],
              items: []
            }
          ],
        });
        setStep(1);
      }
    }
  }, [isOpen, proposalToEdit]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch(`${baseUrl}/admin/customers/all`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.ok) {
        setCustomers(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch customers');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAddDay = () => {
    if (formData.itineraryDays.length >= 10) {
      toast.error('Maximum 10 days allowed');
      return;
    }

    const lastDay = formData.itineraryDays[formData.itineraryDays.length - 1];
    const lastDate = new Date(lastDay.date);
    const nextDay = {
      dayNumber: lastDay.dayNumber + 1,
      date: new Date(lastDate.setDate(lastDate.getDate() + 1)).toISOString().split('T')[0],
      items: []
    };

    setFormData((prev) => ({
      ...prev,
      itineraryDays: [...prev.itineraryDays, nextDay],
    }));
  };

  const handleRemoveDay = (index: number) => {
    if (formData.itineraryDays.length <= 2) {
      toast.error('Minimum 2 days required');
      return;
    }

    setFormData((prev) => {
      const updatedDays = prev.itineraryDays.filter((_, i) => i !== index).map((day, i) => ({
        ...day,
        dayNumber: i + 1
      }));
      return { ...prev, itineraryDays: updatedDays };
    });
  };

  const handleDayDateChange = (index: number, newDate: string) => {
    setFormData((prev) => {
      const updatedDays = [...prev.itineraryDays];
      updatedDays[index] = { ...updatedDays[index], date: newDate };
      return { ...prev, itineraryDays: updatedDays };
    });
  };

  const nextStep = () => {
    if (step === 1 && !formData.customerId) {
      toast.error('Please select a customer');
      return;
    }
    
    if (step === 1 && !formData.name) {
      toast.error('Please enter a proposal name');
      return;
    }
    
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const filteredCustomers = searchTerm 
    ? customers.filter(customer => 
        `${customer.guestFirstName} ${customer.guestLastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.guestEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : customers;

  if (!isOpen) return null;

  return (
    <div className="p-4 flex-1 overflow-auto">
      {/* Step indicators */}
      <div className="mb-6">
        <div className="flex items-center justify-between w-full">
          <div
            className={`flex-1 text-center py-2 rounded-l-lg ${
              step === 1 ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            1. Basic Info
          </div>
          <div
            className={`flex-1 text-center py-2 ${
              step === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            2. Itinerary Days
          </div>
          <div
            className={`flex-1 text-center py-2 rounded-r-lg ${
              step === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            3. Payment Plan
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  placeholder="Search for customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="mt-2 max-h-40 overflow-auto border border-gray-200 rounded-lg">
                  {loadingCustomers ? (
                    <div className="p-2 text-center text-gray-500">Loading customers...</div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-2 cursor-pointer hover:bg-gray-100 ${
                          formData.customerId === customer.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, customerId: customer.id }));
                          setSearchTerm(`${customer.guestFirstName} ${customer.guestLastName}`);
                        }}
                      >
                        <div className="font-medium">
                          {customer.guestFirstName} {customer.guestLastName}
                        </div>
                        <div className="text-sm text-gray-500">{customer.guestEmail}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-center text-gray-500">No customers found</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Proposal Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Smith & Johnson Wedding"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="weddingDate" className="block text-sm font-medium text-gray-700">
                Wedding Date
              </label>
              <input
                type="date"
                id="weddingDate"
                name="weddingDate"
                value={formData.weddingDate}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="mainGuestCount" className="block text-sm font-medium text-gray-700">
                Main Guest Count
              </label>
              <input
                type="number"
                id="mainGuestCount"
                name="mainGuestCount"
                value={formData.mainGuestCount}
                onChange={handleNumberChange}
                min="1"
                max="120"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700">
                Terms and Conditions
              </label>
              <textarea
                id="termsAndConditions"
                name="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Itinerary Days */}
        {step === 2 && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-medium">Itinerary Days</h3>
              <button
                type="button"
                onClick={handleAddDay}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                Add Day
              </button>
            </div>

            {formData.itineraryDays.map((day, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Day {day.dayNumber}</h4>
                  {formData.itineraryDays.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDay(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={day.date}
                    onChange={(e) => handleDayDateChange(index, e.target.value)}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Items will be added in the next phase.
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Payment Plan */}
        {step === 3 && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Payment Plan</h3>
              <p className="text-sm text-gray-500">
                Configure the payment schedule for this wedding proposal.
              </p>
            </div>

            <div className="mb-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-center text-blue-700">
                  Payment plan configuration will be implemented in the next phase.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">
                After saving, you'll be able to add products and services to each day of the itinerary.
              </p>
            </div>
          </div>
        )}
      </form>

      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        ) : (
          <div></div>
        )}
        
        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {loading ? 'Saving...' : proposalToEdit ? 'Update Proposal' : 'Create Proposal'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProposalFormModal; 