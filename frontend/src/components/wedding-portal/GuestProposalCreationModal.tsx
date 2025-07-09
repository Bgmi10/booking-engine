import React, { useState } from 'react';
import { RiAddLine, RiCloseLine, RiUploadLine } from 'react-icons/ri';
import { baseUrl } from '../../utils/constants';
import toast from 'react-hot-toast';

interface VendorContact {
    type: string;
    name: string;
    email?: string;
    phone?: string;
}

interface ServiceRequest {
    type: string;
    description: string;
    images: File[];
}

export const GuestProposalCreationModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [weddingDate, setWeddingDate] = useState('');
    const [mainGuestCount, setMainGuestCount] = useState(0);
    const [vendorContacts, setVendorContacts] = useState<VendorContact[]>([]);
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [holdRequest, setHoldRequest] = useState(false);

    const addVendorContact = () => {
        setVendorContacts([...vendorContacts, { 
            type: '', 
            name: '', 
            email: '', 
            phone: '' 
        }]);
    };

    const updateVendorContact = (index: number, updates: Partial<VendorContact>) => {
        const newContacts = [...vendorContacts];
        newContacts[index] = { ...newContacts[index], ...updates };
        setVendorContacts(newContacts);
    };

    const addServiceRequest = () => {
        setServiceRequests([...serviceRequests, {
            type: '',
            description: '',
            images: []
        }]);
    };

    const updateServiceRequest = (index: number, updates: Partial<ServiceRequest>) => {
        const newRequests = [...serviceRequests];
        newRequests[index] = { ...newRequests[index], ...updates };
        setServiceRequests(newRequests);
    };

    const handleImageUpload = (index: number, files: FileList | null) => {
        if (files) {
            const newRequests = [...serviceRequests];
            newRequests[index].images = Array.from(files);
            setServiceRequests(newRequests);
        }
    };

    const handleSubmitProposal = async () => {
        // Validation
        if (!weddingDate || mainGuestCount <= 0) {
            toast.error('Please provide wedding date and guest count');
            return;
        }

        const formData = new FormData();
        formData.append('weddingDate', weddingDate);
        formData.append('mainGuestCount', mainGuestCount.toString());
        formData.append('holdRequest', holdRequest.toString());

        // Add vendor contacts
        vendorContacts.forEach((contact, index) => {
            formData.append(`vendorContacts[${index}][type]`, contact.type);
            formData.append(`vendorContacts[${index}][name]`, contact.name);
            if (contact.email) formData.append(`vendorContacts[${index}][email]`, contact.email);
            if (contact.phone) formData.append(`vendorContacts[${index}][phone]`, contact.phone);
        });

        // Add service requests with images
        serviceRequests.forEach((request, index) => {
            formData.append(`serviceRequests[${index}][type]`, request.type);
            formData.append(`serviceRequests[${index}][description]`, request.description);
            request.images.forEach((image, imageIndex) => {
                formData.append(`serviceRequests[${index}][images][${imageIndex}]`, image);
            });
        });

        try {
            const response = await fetch(`${baseUrl}/customers/proposals/create`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Proposal submitted successfully');
                onClose();
            } else {
                throw new Error(data.message || 'Failed to submit proposal');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while submitting proposal');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 my-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Create Your Wedding Proposal</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <RiCloseLine className="text-2xl" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Wedding Date and Guest Count */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 mb-2">Wedding Date</label>
                            <input 
                                type="date"
                                value={weddingDate}
                                onChange={(e) => setWeddingDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">Main Guest Count</label>
                            <input 
                                type="number"
                                value={mainGuestCount}
                                onChange={(e) => setMainGuestCount(parseInt(e.target.value))}
                                min={1}
                                max={120}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Hold Request */}
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox"
                            checked={holdRequest}
                            onChange={(e) => setHoldRequest(e.target.checked)}
                            className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                        />
                        <label className="text-gray-700">
                            Hold Dates for 5 Days (Tentative Booking)
                        </label>
                    </div>

                    {/* Vendor Contacts */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Vendor Contacts</h3>
                            <button 
                                onClick={addVendorContact}
                                className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                                <RiAddLine className="mr-1" /> Add Vendor
                            </button>
                        </div>
                        {vendorContacts.map((contact, index) => (
                            <div key={index} className="grid md:grid-cols-2 gap-4 mb-4">
                                <select
                                    value={contact.type}
                                    onChange={(e) => updateVendorContact(index, { type: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">Select Vendor Type</option>
                                    <option value="Photographer">Photographer</option>
                                    <option value="Hair & Makeup">Hair & Makeup</option>
                                    <option value="Catering">Catering</option>
                                    <option value="Other">Other</option>
                                </select>
                                <input 
                                    type="text"
                                    placeholder="Vendor Name"
                                    value={contact.name}
                                    onChange={(e) => updateVendorContact(index, { name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                                <input 
                                    type="email"
                                    placeholder="Email (Optional)"
                                    value={contact.email || ''}
                                    onChange={(e) => updateVendorContact(index, { email: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                                <input 
                                    type="tel"
                                    placeholder="Phone (Optional)"
                                    value={contact.phone || ''}
                                    onChange={(e) => updateVendorContact(index, { phone: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Service Requests */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Custom Service Requests</h3>
                            <button 
                                onClick={addServiceRequest}
                                className="text-blue-600 hover:text-blue-800 flex items-center"
                            >
                                <RiAddLine className="mr-1" /> Add Request
                            </button>
                        </div>
                        {serviceRequests.map((request, index) => (
                            <div key={index} className="space-y-4 mb-4 p-4 border rounded-lg">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <select
                                        value={request.type}
                                        onChange={(e) => updateServiceRequest(index, { type: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="">Select Service Type</option>
                                        <option value="Catering">Catering</option>
                                        <option value="Decoration">Decoration</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <div className="flex items-center">
                                        <label 
                                            htmlFor={`image-upload-${index}`} 
                                            className="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-100"
                                        >
                                            <RiUploadLine className="mr-2" />
                                            {request.images.length > 0 
                                                ? `${request.images.length} image(s) selected` 
                                                : 'Upload Images'}
                                        </label>
                                        <input 
                                            id={`image-upload-${index}`}
                                            type="file" 
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(index, e.target.files)}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Describe your custom service request..."
                                    value={request.description}
                                    onChange={(e) => updateServiceRequest(index, { description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg h-32"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmitProposal}
                        className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 
                                   flex items-center justify-center"
                    >
                        <RiAddLine className="mr-2" /> Submit Proposal
                    </button>
                </div>
            </div>
        </div>
    );
}; 