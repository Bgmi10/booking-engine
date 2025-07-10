import React, { useState, useEffect, useRef } from 'react';
import { baseUrl } from '../../utils/constants';
import { useImageUpload } from '../../hooks/useImageUpload';
import { IoSend, IoAttach, IoCheckmarkCircle, IoCloseCircle, IoClose, IoHourglassOutline } from 'react-icons/io5';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Loader from '../Loader';

interface ServiceRequestModalProps {
    proposalId: string;
    onClose: () => void;
    serviceRequestId?: string; 
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

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({ 
    proposalId, 
    serviceRequestId, 
    onClose 
}) => {
    const [loading, setLoading] = useState(!!serviceRequestId);
    const [submitting, setSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [messageText, setMessageText] = useState('');
    const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (serviceRequestId) {
            fetchServiceRequest();
        }
    }, [serviceRequestId]);

    useEffect(() => {
        scrollToBottom();
    }, [serviceRequest?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchServiceRequest = async () => {
        if (!serviceRequestId) return;
        setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/customers/proposals/${proposalId}/service-requests/${serviceRequestId}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch service request');
            const data = await response.json();
            setServiceRequest(data.data);
        } catch (error) {
            console.error('Error fetching service request:', error);
            toast.error('Failed to load service request');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitServiceRequest = async () => {
        if (!title || !description) {
            toast.error('Please provide a title and description');
            return;
        }
        setSubmitting(true);
        try {
            const response = await fetch(`${baseUrl}/customers/proposals/${proposalId}/service-requests`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    images: images.map(url => ({ url, fileName: url.split('/').pop() || 'image', fileType: 'image/jpeg', fileSize: 0 })),
                }),
            });
            if (!response.ok) throw new Error('Failed to create service request');
            const data = await response.json();
            setServiceRequest(data.data);
            resetImages();
            toast.success('Service request submitted successfully!');
        } catch (error) {
            console.error('Error creating service request:', error);
            toast.error('Failed to submit service request');
        } finally {
            setSubmitting(false);
        }
    };
    
    const handleSendMessage = async () => {
        if (!messageText.trim() && images.length === 0) return;
        if (!serviceRequest) return;

        setSubmitting(true);
        try {
            const response = await fetch(`${baseUrl}/customers/service-requests/${serviceRequest.id}/messages`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: messageText,
                    sender: 'GUEST',
                    attachments: images.map(url => ({ url, fileName: url.split('/').pop() || 'image', fileType: 'image/jpeg', fileSize: 0 })),
                }),
            });

            if (!response.ok) throw new Error('Failed to send message');
            
            const newMessage = await response.json();
            setServiceRequest(prev => prev ? { ...prev, messages: [...prev.messages, newMessage.data] } : null);
            
            setMessageText('');
            resetImages();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
            await fetchServiceRequest();
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuoteAction = async (action: 'accept' | 'reject') => {
        if (!serviceRequest) return;
        setSubmitting(true);
        try {
            const response = await fetch(`${baseUrl}/customers/service-requests/${serviceRequest.id}/${action}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!response.ok) throw new Error(`Failed to ${action} quote`);
            await fetchServiceRequest();
            toast.success(`Quote ${action}ed successfully!`);
        } catch (error) {
            console.error(`Error ${action}ing quote:`, error);
            toast.error(`Failed to ${action} quote`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            uploadImages(Array.from(e.target.files));
        }
    };

    const getStatusInfo = (status: ServiceRequest['status']) => {
        switch (status) {
            case 'PENDING': return { bg: 'bg-blue-100', text: 'text-blue-800' };
            case 'QUOTED': return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
            case 'ACCEPTED': return { bg: 'bg-green-100', text: 'text-green-800' };
            case 'REJECTED': return { bg: 'bg-red-100', text: 'text-red-800' };
            case 'COMPLETED': return { bg: 'bg-teal-100', text: 'text-teal-800' };
            case 'CANCELLED': return { bg: 'bg-gray-100', text: 'text-gray-800' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
        }
    };

    const renderMessages = () => (
        <div className="max-h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            {serviceRequest?.messages?.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'GUEST' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-lg py-2 px-4 max-w-sm break-words ${msg.sender === 'GUEST' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {msg.text}
                        {msg.attachments?.length > 0 && (
                            <div className={msg.text ? 'mt-3' : ''}>
                                {msg.attachments.map((att) => (
                                    <div key={att.id} className="mb-2 last:mb-0">
                                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                                            <img src={att.url} alt={att.fileName} className="max-w-full max-h-48 rounded-md" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(msg.createdAt), 'MMM d, h:mm a')} • {msg.sender === 'GUEST' ? 'You' : 'Admin'}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
    
    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-64"><Loader /></div>;
        }

        if (serviceRequest) {
            const statusInfo = getStatusInfo(serviceRequest.status);
            return (
                <div>
                    <div className="mb-5 flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{serviceRequest.title}</h3>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                                    {serviceRequest.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                    Requested on {format(new Date(serviceRequest.createdAt), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </div>
                        {serviceRequest.price && serviceRequest.status !== 'PENDING' && (
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Quote</div>
                                <div className="text-xl font-bold">€{serviceRequest.price.toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                    <div className="mb-5 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{serviceRequest.description}</p>
                    </div>

                    {serviceRequest.status === 'QUOTED' && (
                        <div className="my-5 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Quote Received</h4>
                            <p className="text-gray-700">The venue has provided a quote of <strong>€{serviceRequest.price?.toFixed(2)}</strong>.</p>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => handleQuoteAction('accept')} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                                    <IoCheckmarkCircle /> Accept Quote
                                </button>
                                <button onClick={() => handleQuoteAction('reject')} disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                                    <IoCloseCircle /> Reject Quote
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {renderMessages()}

                    {serviceRequest.status !== 'CANCELLED' && serviceRequest.status !== 'REJECTED' && serviceRequest.status !== 'COMPLETED' && (
                        <div className="mt-5 pt-5 border-t border-gray-200">
                            <div className="flex gap-3 mb-3">
                                <input
                                    placeholder="Type your message..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !submitting && handleSendMessage()}
                                    disabled={submitting || uploadingImage}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button title="Attach files" onClick={() => document.getElementById('customer-message-file-input')?.click()} disabled={submitting || uploadingImage} className="p-3 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50">
                                    <IoAttach size={20} />
                                </button>
                                <input type="file" id="customer-message-file-input" multiple accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
                                <button onClick={handleSendMessage} disabled={(!messageText.trim() && images.length === 0) || uploadingImage || submitting} className="p-3 rounded-full text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50">
                                    {submitting ? <IoHourglassOutline className="animate-spin" /> : <IoSend size={20} />}
                                </button>
                            </div>
                            {images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {images.map((url, i) => <img key={i} src={url} alt="preview" className="w-16 h-16 object-cover rounded-md" />)}
                                </div>
                            )}
                            {uploadingImage && <div className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Loader /><span>Uploading...</span></div>}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div>
                <h3 className="text-2xl font-bold text-gray-900">Request a Custom Service</h3>
                <p className="mt-2 text-sm text-gray-600">Need something special? Let us know what you're looking for.</p>
                <form className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmitServiceRequest(); }}>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                        <input type="text" id="title" placeholder="e.g., Custom Wedding Cake" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" placeholder="Describe what you're looking for..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Attach Images (Optional)</label>
                        <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer" onClick={() => document.getElementById('file-input')?.click()}>
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                <p className="text-sm text-gray-600">Click or drag images to upload</p>
                            </div>
                            <input type="file" id="file-input" multiple accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
                        </div>
                        {images.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{images.map((url, i) => <img key={i} src={url} alt="preview" className="w-20 h-20 object-cover rounded-md" />)}</div>}
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={submitting || !title || !description} className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {serviceRequestId ? 'Manage Service Request' : 'New Service Request'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IoClose size={24} /></button>
                </div>
                <div className="p-5 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}; 