import React, { useState } from 'react';
import { RiAddLine, RiCloseLine } from 'react-icons/ri';
import { baseUrl } from '../../utils/constants';
import toast from 'react-hot-toast';

interface ServiceRequestModalProps {
    proposalId: string;
    onClose: () => void;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({ proposalId, onClose }) => {
    const [serviceType, setServiceType] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const serviceOptions = [
        'Catering Customization',
        'Venue Decoration',
        'Photography',
        'Entertainment',
        'Transportation',
        'Other'
    ];

    const handleSubmitServiceRequest = async () => {
        if (!serviceType || !description.trim()) {
            toast.error('Please select a service type and provide a description');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${baseUrl}/customers/proposals/${proposalId}/service-requests`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serviceType,
                    description,
                    proposalId
                })
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Service request submitted successfully');
                onClose();
            } else {
                throw new Error(data.message || 'Failed to submit service request');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while submitting service request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Custom Service Request</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <RiCloseLine className="text-2xl" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-700 mb-2">Service Type</label>
                        <select
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="">Select Service Type</option>
                            {serviceOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg h-32"
                            placeholder="Provide details about your custom service request..."
                        />
                    </div>

                    <button
                        onClick={handleSubmitServiceRequest}
                        disabled={isSubmitting}
                        className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-900 
                                   flex items-center justify-center
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="animate-spin h-5 w-5 border-t-2 border-white rounded-full"></div>
                        ) : (
                            <>
                                <RiAddLine className="mr-2" /> Submit Service Request
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}; 