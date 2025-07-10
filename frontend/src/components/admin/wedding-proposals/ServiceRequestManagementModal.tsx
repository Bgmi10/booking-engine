import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { baseUrl } from '../../../utils/constants';
import { useImageUpload } from '../../../hooks/useImageUpload';
import { IoSend, IoAttach, IoCheckmarkCircle, IoClose, IoHourglassOutline, IoAlertCircleOutline } from 'react-icons/io5';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ServiceRequestManagementModalProps {
    proposalId: string;
    serviceRequestId: string;
    onClose: () => void;
    onUpdate?: () => void;
}

interface ServiceMessage {
    id: string;
    text: string | null;
    sender: 'GUEST' | 'ADMIN';
    createdAt: string;
    attachments: {
        id: string;
        url: string;
        fileName: string;
        fileType: string;
    }[];
}

interface ServiceRequest {
    id: string;
    title: string;
    description: string;
    status: 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
    price?: number;
    guestCount?: number;
    messages: ServiceMessage[];
    createdAt: string;
    updatedAt: string;
}

const Spinner = () => (
    <div className="flex justify-center items-center">
        <IoHourglassOutline className="animate-spin text-4xl text-blue-500" />
    </div>
);


export const ServiceRequestManagementModal: React.FC<ServiceRequestManagementModalProps> = ({ 
    proposalId, 
    serviceRequestId, 
    onClose,
    onUpdate
}) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
    const [messageText, setMessageText] = useState('');
    const [price, setPrice] = useState<number | null>(null);
    const [guestCount, setGuestCount] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Use the image upload hook
    const { 
        images, 
        uploadingImage, 
        uploadImages, 
        resetImages, 
        handleDragEnter, 
        handleDragLeave, 
        handleDragOver, 
        handleDrop 
    } = useImageUpload();

    useEffect(() => {
        fetchServiceRequest();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [serviceRequest?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchServiceRequest = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/admin/proposals/${proposalId}/service-requests/${serviceRequestId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch service request');
            }

            const data = await response.json();
            setServiceRequest(data.data);
            
            // Set initial price and guest count if available
            if (data.data.price) setPrice(data.data.price);
            if (data.data.guestCount) setGuestCount(data.data.guestCount);
            
        } catch (error) {
            console.error('Error fetching service request:', error);
            toast.error('Failed to load service request');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText && images.length === 0) {
            toast.error('Please enter a message or attach an image');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${baseUrl}/admin/service-requests/${serviceRequestId}/messages`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: messageText,
                    sender: 'ADMIN',
                    attachments: images.map(url => ({
                        url,
                        fileName: url.split('/').pop() || 'image',
                        fileType: 'image/jpeg',
                        fileSize: 0
                    }))
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            // Refresh the service request
            await fetchServiceRequest();
            setMessageText('');
            resetImages();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitQuote = async () => {
        if (!price) {
            toast.error('Please enter a price for the quote');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${baseUrl}/admin/service-requests/${serviceRequestId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'QUOTED',
                    price,
                    guestCount: guestCount || undefined
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit quote');
            }

            // Refresh the service request
            await fetchServiceRequest();
            toast.success('Quote submitted successfully');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error submitting quote:', error);
            toast.error('Failed to submit quote');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkCompleted = async () => {
        setSubmitting(true);
        try {
            const response = await fetch(`${baseUrl}/admin/service-requests/${serviceRequestId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'COMPLETED'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark as completed');
            }

            // Refresh the service request
            await fetchServiceRequest();
            toast.success('Service request marked as completed');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error marking as completed:', error);
            toast.error('Failed to mark as completed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadImages(Array.from(e.target.files));
        }
    };

    const renderMessages = () => {
        if (!serviceRequest?.messages.length) return null;

        return (
            <div className="messages-container max-h-96 overflow-y-auto mb-5 space-y-4 p-4 bg-gray-50 rounded-lg">
                {serviceRequest.messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'ADMIN' ? 'items-end' : 'items-start'}`}
                    >
                        <div
                            className={`rounded-lg py-2 px-4 max-w-sm md:max-w-md break-words ${
                                msg.sender === 'ADMIN'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            {msg.text}
                            
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className={msg.text ? 'mt-3' : ''}>
                                    {msg.attachments.map((attachment) => (
                                        <div key={attachment.id} className="mb-2 last:mb-0">
                                            {attachment.fileType.startsWith('image/') ? (
                                                <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={attachment.url}
                                                        alt={attachment.fileName}
                                                        className="max-w-full max-h-48 rounded-md"
                                                    />
                                                </a>
                                            ) : (
                                                <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-current hover:underline">
                                                    <IoAttach /> {attachment.fileName}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div
                            className="text-xs text-gray-500 mt-1"
                        >
                            {format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')} • {msg.sender === 'ADMIN' ? 'You' : 'Guest'}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        );
    };

    const renderQuoteForm = () => {
        if (serviceRequest?.status !== 'PENDING') {
            return null;
        }

        return (
            <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-lg font-semibold text-gray-800 mt-0 mb-4">Provide Quote</h4>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (€) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            min={0}
                            step="0.01"
                            value={price ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(e.target.valueAsNumber)}
                            placeholder="Enter price"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guest Count (Optional)</label>
                        <input
                             type="number"
                             className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                             min={1}
                             value={guestCount ?? ''}
                             onChange={(e: ChangeEvent<HTMLInputElement>) => setGuestCount(e.target.valueAsNumber)}
                             placeholder="Enter guest count if applicable"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Only needed if the price is per person
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmitQuote}
                        disabled={submitting || !price}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Submitting...' : 'Submit Quote'}
                    </button>
                </form>
            </div>
        );
    };

    const renderQuoteInfo = () => {
        if (serviceRequest?.status !== 'QUOTED' && serviceRequest?.status !== 'ACCEPTED') {
            return null;
        }

        return (
            <div className="mb-5 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-lg font-semibold text-gray-800 mt-0 mb-2">Quote Information</h4>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="m-0 mb-2">
                            <strong>Price:</strong> €{serviceRequest.price?.toFixed(2)}
                        </p>
                        {serviceRequest.guestCount && (
                            <p className="m-0">
                                <strong>Guest Count:</strong> {serviceRequest.guestCount}
                            </p>
                        )}
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(serviceRequest.status).bg} ${getStatusColor(serviceRequest.status).text}`}>
                        {serviceRequest.status}
                    </span>
                </div>
            </div>
        );
    };

    const renderActionButtons = () => {
        if (serviceRequest?.status !== 'ACCEPTED') {
            return null;
        }

        return (
            <div className="mb-5 flex justify-end">
                <button
                    type="button"
                    onClick={handleMarkCompleted}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <IoCheckmarkCircle />
                    {submitting ? 'Marking...' : 'Mark as Completed'}
                </button>
            </div>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return { bg: 'bg-blue-100', text: 'text-blue-800' };
            case 'QUOTED':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
            case 'ACCEPTED':
                return { bg: 'bg-green-100', text: 'text-green-800' };
            case 'REJECTED':
                return { bg: 'bg-red-100', text: 'text-red-800' };
            case 'COMPLETED':
                return { bg: 'bg-green-100', text: 'text-green-800' };
            case 'CANCELLED':
                return { bg: 'bg-red-100', text: 'text-red-800' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-800' };
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50  bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-transform duration-300 scale-95 hover:scale-100">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Manage Service Request</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <IoClose size={24} />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Spinner />
                        </div>
                    ) : serviceRequest ? (
                        <div>
                            <div className="mb-5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{serviceRequest.title}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(serviceRequest.status).bg} ${getStatusColor(serviceRequest.status).text}`}>
                                            {serviceRequest.status}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Requested on {format(new Date(serviceRequest.createdAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-5 p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {serviceRequest.description}
                                </p>
                            </div>

                            {renderQuoteForm()}
                            {renderQuoteInfo()}
                            {renderActionButtons()}
                            {renderMessages()}

                            <div className="mt-5 pt-5 border-t border-gray-200">
                                <div className="flex gap-3 mb-3">
                                    <input
                                        placeholder="Type your message..."
                                        value={messageText}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        disabled={submitting || uploadingImage}
                                        className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                    <button
                                        title="Attach files"
                                        onClick={() => document.getElementById('admin-message-file-input')?.click()}
                                        disabled={submitting || uploadingImage}
                                        className="p-3 h-full rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <IoAttach size={20} />
                                    </button>
                                    <input
                                        type="file"
                                        id="admin-message-file-input"
                                        multiple
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleFileSelect}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendMessage}
                                        disabled={(!messageText && images.length === 0) || uploadingImage || submitting}
                                        className="inline-flex items-center justify-center p-3 rounded-full text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? <IoHourglassOutline className="animate-spin"/> : <IoSend size={20} />}
                                    </button>
                                </div>

                                {images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {images.map((url, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={url}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-16 h-16 object-cover rounded-md"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {uploadingImage && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                        <Spinner />
                                        <span>Uploading image(s)...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <IoAlertCircleOutline className="mx-auto text-5xl text-gray-400 mb-4" />
                            <p className="text-lg text-gray-600">Service request not found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 