import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeddingPortalAuth } from '../../context/WeddingPortalAuthContext';
import { baseUrl } from '../../utils/constants';
import toast from 'react-hot-toast';
import Header from '../Header';
import Loader from '../Loader';
import { ServiceRequestModal } from './ServiceRequestModal';
import { GuestProposalCreationModal } from './GuestProposalCreationModal';
import { ItineraryManagementModal } from './ItineraryManagementModal';
import { 
    RiCalendarLine, 
    RiMoneyEuroBoxLine, 
    RiUserLine, 
    RiFileTextLine,
    RiDownloadLine,
    RiErrorWarningLine,
    RiPlaneLine,
    RiContactsLine,
    RiWalletLine,
    RiAddLine,
    RiEditLine,
    RiMenuLine,
    RiCloseLine,
    RiToolsLine // For Service Requests
} from 'react-icons/ri';

export default function WeddingPortalDashboard() {
    const { logout, user, isAuthenticated }: { logout: () => void, user: any, isAuthenticated: boolean } = useWeddingPortalAuth();
    const sidebarParams = new URLSearchParams(window.location.search).get("sidebar");
    const [proposals, setProposals] = useState<any[]>([]);
    const [selectedProposal, setSelectedProposal] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [acceptLoading, setAcceptLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'overview' | 'itinerary' | 'payment' | 'guests' | 'vendors' | 'services' | any >('overview');
    
    // State for modals
    const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
    const [selectedServiceRequestId, setSelectedServiceRequestId] = useState<string | undefined>(undefined);
    const [isGuestProposalCreationModalOpen, setIsGuestProposalCreationModalOpen] = useState(false);
    const [isItineraryManagementModalOpen, setIsItineraryManagementModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileOverlayOpen, setIsProfileOverlayOpen] = useState(false);
    const profileOverlayRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
      if (sidebarParams)  {
        setActiveSection(sidebarParams);
      }
    }, [sidebarParams]);

    const fetchAllProposals = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/customers/proposals`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (response.ok) {
                const fetchedProposals = data.data;
                setProposals(fetchedProposals);
                
                if (fetchedProposals.length > 0) {
                    // If a proposal is already selected, update it, otherwise set a new one
                    const currentSelectedId = selectedProposal?.id;
                    const updatedSelected = fetchedProposals.find((p: any) => p.id === currentSelectedId);
                    if (updatedSelected) {
                        setSelectedProposal(updatedSelected);
                    } else {
                        const activeProposal = fetchedProposals.find((p: any) => p.status !== 'COMPLETED') || fetchedProposals[0];
                        setSelectedProposal(activeProposal);
                    }
                }
            } else {
                throw new Error(data.message || 'Failed to fetch proposals');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred while fetching proposals');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/wedding-portal/login');
            return;
        }
        fetchAllProposals();
    }, [isAuthenticated, user, navigate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileOverlayRef.current && !profileOverlayRef.current.contains(event.target as Node)) {
                setIsProfileOverlayOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/wedding-portal/login');
        } catch (error) {
            toast.error('Logout failed');
        }
    };

    const handleAcceptProposal = async () => {
        setAcceptLoading(true);
        try {
            const response = await fetch(`${baseUrl}/customers/proposals/${selectedProposal.id}/accept`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Proposal accepted successfully');
                fetchAllProposals(); // Re-fetch all data
            } else {
                let errorMessage = data.message || 'Failed to accept proposal';
                toast.error(
                    <div className="flex items-center">
                        <RiErrorWarningLine className="mr-2 text-xl" />
                        <span>{errorMessage}</span>
                    </div>,
                    { duration: 4000 }
                );
            }
        } catch (error: any) {
            toast.error(
                <div className="flex items-center">
                    <RiErrorWarningLine className="mr-2 text-xl" />
                    <span>An unexpected error occurred. Please try again later.</span>
                </div>,
                { duration: 4000 }
            );
        } finally {
            setAcceptLoading(false);
        }
    };

    const handleDownloadProposal = async () => {
        setDownloadLoading(true);
        try {
            const response = await fetch(`${baseUrl}/customers/proposals/${selectedProposal.id}/download`, {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Wedding_Proposal_${selectedProposal.name.replace(/ /g, '_')}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast.success('Proposal downloaded successfully');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to download proposal');
            }
        } catch (error: any) {
            toast.error(
                <div className="flex items-center">
                    <RiErrorWarningLine className="mr-2 text-xl" />
                    <span>{error.message || 'An error occurred while downloading the proposal'}</span>
                </div>,
                { duration: 4000 }
            );
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleProposalChange = (proposal: any) => {
        setSelectedProposal(proposal);
    };

    const handleItineraryUpdate = (updatedProposal: any) => {
        setSelectedProposal(updatedProposal);
        setProposals(prevProposals => 
            prevProposals.map(p => p.id === updatedProposal.id ? updatedProposal : p)
        );
    };
    
    const handleOpenServiceRequestModal = (requestId?: string) => {
        setSelectedServiceRequestId(requestId);
        setIsServiceRequestModalOpen(true);
    };
    
    const handleUpdateGuestCount = async (dayId: string, newCount: number) => {
        try {
            // If dayId matches the proposal ID, we're updating the main guest count
            if (dayId === selectedProposal.id) {
                const response = await fetch(`${baseUrl}/customers/proposals/${selectedProposal.id}/guest-count`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ mainGuestCount: newCount })
                });
                const data = await response.json();
                
                if (response.ok) {
                    toast.success('Main guest count updated successfully');
                    // Update the local state with the new proposal data
                    setSelectedProposal(data.data);
                } else {
                    throw new Error(data.message || 'Failed to update guest count');
                }
            } else {
                // For itinerary day guest counts, use the existing endpoint
                const response = await fetch(`${baseUrl}/customers/proposals/${selectedProposal.id}/days/${dayId}/guests`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ guestCount: newCount })
                });
                const data = await response.json();
                
                if (response.ok) {
                    toast.success('Guest count updated successfully');
                    // Update the local state with the new proposal data
                    setSelectedProposal(data.data);
                } else {
                    throw new Error(data.message || 'Failed to update guest count');
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
            case 'QUOTED': return { bg: 'bg-blue-100', text: 'text-blue-800' };
            case 'ACCEPTED': return { bg: 'bg-green-100', text: 'text-green-800' };
            case 'REJECTED': return { bg: 'bg-red-100', text: 'text-red-800' };
            case 'COMPLETED': return { bg: 'bg-teal-100', text: 'text-teal-800' };
            case 'CANCELLED': return { bg: 'bg-gray-100', text: 'text-gray-800' };
            case 'PAID': return { bg: 'bg-green-100', text: 'text-green-800' };
            case 'OVERDUE': return { bg: 'bg-red-100', text: 'text-red-800' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
        }
    };
    
    // --- RENDER SECTIONS ---

    const renderOverviewSection = () => (
        <div className="w-full max-w-md mx-auto space-y-6">
            {proposals.length > 0 ? (
                <div className="bg-gray-100 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Your Proposals</h3>
                        <button onClick={() => setIsGuestProposalCreationModalOpen(true)} className="text-blue-600 hover:text-blue-800 flex items-center text-sm">
                            <RiAddLine className="mr-1" /> New Proposal
                        </button>
                    </div>
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                        {proposals.map((proposal, index) => (
                            <button
                                key={proposal.id}
                                onClick={() => handleProposalChange(proposal)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${selectedProposal?.id === proposal.id ? 'bg-black text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                Proposal {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-600 space-y-4">
                    <p>No active wedding proposals found.</p>
                    <button onClick={() => setIsGuestProposalCreationModalOpen(true)} className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 flex items-center justify-center mx-auto">
                        <RiAddLine className="mr-2" /> Create Your First Proposal
                    </button>
                </div>
            )}

            {selectedProposal && (
                <div className="bg-gray-100 rounded-xl p-6 space-y-4">
                    <div className="flex items-center space-x-4">
                        <RiCalendarLine className="text-2xl text-gray-700" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Wedding Date</h3>
                            <p className="text-gray-600">{new Date(selectedProposal.weddingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <RiUserLine className="text-2xl text-gray-700" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Main Guest Count</h3>
                            <p className="text-gray-600">{selectedProposal.mainGuestCount} Guests</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <RiMoneyEuroBoxLine className="text-2xl text-gray-700" />
        <div>
                            <h3 className="font-semibold text-gray-900">Proposal Status</h3>
                            <p className={`${selectedProposal.status === 'ACCEPTED' ? 'text-green-600' : 'text-gray-600'}`}>{selectedProposal.status}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        {selectedProposal.status === 'SENT' && (
                            <button onClick={handleAcceptProposal} disabled={acceptLoading} className="flex-1 bg-black text-white py-3 rounded-lg hover:bg-gray-900 flex items-center justify-center disabled:opacity-50">
                                {acceptLoading ? <div className="animate-spin h-5 w-5 border-t-2 border-white rounded-full"></div> : 'Accept Proposal'}
                            </button>
                        )}
                        <button onClick={handleDownloadProposal} disabled={downloadLoading} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 flex items-center justify-center disabled:opacity-50">
                            {downloadLoading ? <div className="animate-spin h-5 w-5 border-t-2 border-gray-800 rounded-full"></div> : <><RiDownloadLine className="mr-2" /> Download</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );


    const renderServiceRequestSection = () => {
        if (!selectedProposal || !selectedProposal.serviceRequests) {
            return <div className="text-center text-gray-600">No service requests for this proposal.</div>;
        }

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Bespoke Service Requests</h2>
                    <button onClick={() => handleOpenServiceRequestModal()} className="bg-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-900">
                        <RiAddLine className="mr-2" /> New Request
                    </button>
                </div>

                {selectedProposal.serviceRequests.length > 0 ? (
                    <div className="bg-white rounded-lg shadow">
                        <ul className="divide-y divide-gray-200">
                            {selectedProposal.serviceRequests.map((request: any) => (
                                <li key={request.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenServiceRequestModal(request.id)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <RiToolsLine className="h-6 w-6 text-gray-500" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-900">{request.title}</p>
                                                <p className="text-sm text-gray-500">Requested on {new Date(request.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status).bg} ${getStatusColor(request.status).text}`}>
                                                {request.status}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="text-center text-gray-600 py-10 bg-gray-50 rounded-lg">
                        <p>You haven't made any custom service requests yet.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderActiveSection = () => {
        switch (activeSection) {
            case 'overview': return renderOverviewSection();
            case 'itinerary': return renderItinerarySection();
            case 'payment': return renderPaymentSection();
            case 'guests': return renderGuestManagementSection();
            case 'vendors': return renderVendorInformationSection();
            case 'services': return renderServiceRequestSection();
            default: return renderOverviewSection();
        }
    };
    
    // --- MAIN RENDER ---

    if (isLoading) {
        return <Loader />;
    }
    const renderItinerarySection = () => {
        if (!selectedProposal || !selectedProposal.itineraryDays) {
            return <div className="text-center text-gray-600">No itinerary available</div>;
        }

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Wedding Itinerary</h2>
                    <button 
                        onClick={() => setIsItineraryManagementModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                        <RiEditLine className="mr-2" /> Update Itinerary
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-6 space-y-8">
                    {selectedProposal.itineraryDays.sort((a: any, b: any) => a.dayNumber - b.dayNumber).map((day: any) => (
                        <div key={day.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Day {day.dayNumber}</h3>
                                <div className="text-gray-600">
                                    {new Date(day.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {day.items.length === 0 ? (
                                    <p className="text-gray-500 italic">No activities planned for this day</p>
                                ) : (
                                    day.items.map((item: any) => (
                                        <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center">
                                                        <h4 className="font-semibold">{item.product?.name}</h4>
                                                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                                            item.status === 'CONFIRMED' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                    {item.product?.description && (
                                                        <p className="text-gray-600 text-sm mt-1">{item.product.description}</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">
                                                        Guests: {item.guestCount}
                                                    </div>
                                                    <div className="text-blue-600 font-semibold">
                                                        €{item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>
                                            {item.notes && (
                                                <div className="mt-2 text-sm text-gray-600 border-t pt-2">
                                                    <span className="font-medium">Notes:</span> {item.notes}
                                                </div>
                                            )}
                                            {item.customMenu && (
                                                <div className="mt-2 text-sm border-t pt-2">
                                                    <div className="font-medium text-gray-700 mb-1">Menu:</div>
                                                    <div className="pl-2 border-l-2 border-gray-300">
                                                        {typeof item.customMenu === 'string' 
                                                            ? item.customMenu 
                                                            : JSON.stringify(item.customMenu)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderPaymentSection = () => {
        if (!selectedProposal || !selectedProposal.paymentPlan) {
            return <div className="text-center text-gray-600">No payment plan available</div>;
        }

        const { paymentPlan } = selectedProposal;
        
        // Filter overdue payments (still in PENDING status, past due date)
        const overduePayments = paymentPlan.stages.filter((stage: any) => 
            stage.status === 'OVERDUE' || 
            (stage.status === 'PENDING' && new Date(stage.dueDate) < new Date())
        );
        
        // Filter pending payments (not yet due)
        const pendingPayments = paymentPlan.stages.filter((stage: any) => 
            stage.status === 'PENDING' && new Date(stage.dueDate) >= new Date()
        );
        
        // Filter payments in processing status (payment link created)
        const processingPayments = paymentPlan.stages.filter((stage: any) => 
            stage.status === 'PROCESSING'
        );
        
        // Filter paid payments
        const paidPayments = paymentPlan.stages.filter((stage: any) => 
            stage.status === 'PAID'
        );

        return (
            <div className="space-y-6">
                <h2 className="text-xl font-semibold">Payment Plan</h2>
                <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900">Total Amount</h3>
                        <span className="text-lg font-bold">€{paymentPlan.totalAmount}</span>
                    </div>
                    
                    {/* Overdue Payments Section */}
                    {overduePayments.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-red-600 font-medium mb-2 flex items-center">
                                <RiErrorWarningLine className="mr-1" /> Overdue Payments
                            </h4>
                            {overduePayments.map((stage: any) => (
                                <div 
                                    key={stage.id} 
                                    className="bg-red-50 border border-red-200 p-3 rounded-lg mb-2 shadow-sm"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-medium text-red-700">{stage.description}</h4>
                                            <p className="text-sm text-red-600">
                                                Due: {new Date(stage.dueDate).toLocaleDateString()} (Overdue)
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            <span className="font-semibold text-red-700">€{stage.amount}</span>
                                            {stage.stripePaymentUrl ? (
                                                <a 
                                                    href={stage.stripePaymentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Pay Now
                                                </a>
                                            ) : (
                                                <span className="text-xs text-red-600">
                                                    Payment link not yet available. Please contact support.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Processing Payments Section */}
                    {processingPayments.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-blue-600 font-medium mb-2">Ready for Payment</h4>
                            {processingPayments.map((stage: any) => (
                                <div 
                                    key={stage.id} 
                                    className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-2 shadow-sm"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-medium text-blue-700">{stage.description}</h4>
                                            <p className="text-sm text-blue-600">
                                                Due: {new Date(stage.dueDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            <span className="font-semibold text-blue-700">€{stage.amount}</span>
                                            {stage.stripePaymentUrl && (
                                                <a 
                                                    href={stage.stripePaymentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Pay Now
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Pending Payments Section */}
                    {pendingPayments.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-gray-700 font-medium mb-2">Upcoming Payments</h4>
                            {pendingPayments.map((stage: any) => (
                                <div 
                                    key={stage.id} 
                                    className="bg-white p-3 rounded-lg mb-2 shadow-sm"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-medium">{stage.description}</h4>
                                            <p className="text-sm text-gray-600">
                                                Due: {new Date(stage.dueDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            <span className="font-semibold">€{stage.amount}</span>
                                            <span className="text-xs text-gray-500">
                                                Payment not yet available
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Completed Payments Section */}
                    {paidPayments.length > 0 && (
                        <div>
                            <h4 className="text-gray-700 font-medium mb-2">Completed Payments</h4>
                            {paidPayments.map((stage: any) => (
                                <div 
                                    key={stage.id} 
                                    className="bg-green-50 border border-green-100 p-3 rounded-lg mb-2 shadow-sm"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-medium">{stage.description}</h4>
                                            <p className="text-sm text-gray-600">
                                                Paid on: {new Date(stage.paidAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                PAID
                                            </span>
                                            <span className="font-semibold">€{stage.amount}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Show if no payments exist */}
                    {paymentPlan.stages.length === 0 && (
                        <div className="text-center text-gray-600 py-4">
                            No payment stages defined
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-2">Payment Status Guide</h4>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center">
                            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                            <span><strong>Overdue:</strong> Payment is past due date</span>
                        </li>
                        <li className="flex items-center">
                            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                            <span><strong>Ready for Payment:</strong> Payment link has been created by staff</span>
                        </li>
                        <li className="flex items-center">
                            <span className="w-3 h-3 bg-gray-300 rounded-full mr-2"></span>
                            <span><strong>Upcoming:</strong> Payment will be available closer to due date</span>
                        </li>
                        <li className="flex items-center">
                            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                            <span><strong>Paid:</strong> Payment has been completed</span>
                        </li>
                    </ul>
                </div>
            </div>
        );
    };

    const renderGuestManagementSection = () => {
        if (!selectedProposal) {
            return <div className="text-center text-gray-600">No proposal selected</div>;
        }
  
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Guest Management</h2>
                <div className="bg-gray-100 p-4 rounded-lg space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900 mb-2">Current Guest Count</h3>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <RiUserLine className="text-gray-700" />
                                <span>Main Guests</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="font-semibold">{selectedProposal.mainGuestCount}</span>
                                <button
                                    onClick={() => {
                                        const newCount = prompt(
                                            'Enter new guest count:',
                                            selectedProposal.mainGuestCount.toString()
                                        );
                                        if (newCount) {
                                            const parsedCount = parseInt(newCount);
                                            if (!isNaN(parsedCount) && parsedCount > 0 && parsedCount <= 120) {
                                                // Pass the proposal ID to update the main guest count
                                                handleUpdateGuestCount(selectedProposal.id, parsedCount);
                                            } else {
                                                toast.error('Invalid guest count. Must be between 1-120.');
                                            }
                                        }
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    <RiEditLine className="text-lg" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-300 pt-4">
                        <h3 className="font-medium text-gray-900 mb-2">Guest Confirmation Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span>Final Guest Confirmation</span>
                                <div className="flex items-center space-x-2">
                                    <span
                                        className={`
                                            px-2 py-1 rounded-full text-xs font-semibold
                                            ${selectedProposal.finalGuestCountConfirmed
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'}
                                        `}
                                    >
                                        {selectedProposal.finalGuestCountConfirmed ? 'Confirmed' : 'Pending'}
                                    </span>
                                    {!selectedProposal.finalGuestCountConfirmed && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const response = await fetch(`${baseUrl}/customers/proposals/${selectedProposal.id}/confirm-guests`, {
                                                        method: 'POST',
                                                        credentials: 'include',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify({ guestCount: selectedProposal.mainGuestCount })
                                                    });
                                                    
                                                    const data = await response.json();
                                                    
                                                    if (response.ok) {
                                                        toast.success('Final guest count confirmed');
                                                        setSelectedProposal({
                                                            ...selectedProposal,
                                                            finalGuestCountConfirmed: true,
                                                            finalGuestCountConfirmedAt: new Date()
                                                        });
                                                    } else {
                                                        throw new Error(data.message || 'Failed to confirm guest count');
                                                    }
                                                } catch (error: any) {
                                                    toast.error(error.message || 'An error occurred');
                                                }
                                            }}
                                            className="bg-black text-white text-xs px-2 py-1 rounded hover:bg-gray-800"
                                        >
                                            Confirm
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderVendorInformationSection = () => {
        if (!selectedProposal) {
            return <div className="text-center text-gray-600">No proposal selected</div>;
        }

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold mb-4">Vendor Information</h2>
                    <button 
                        onClick={() => setIsServiceRequestModalOpen(true)}
                        className="bg-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-900"
                    >
                        <RiAddLine className="mr-2" /> Custom Request
                    </button>
                </div>

                {selectedProposal.vendors && selectedProposal.vendors.length > 0 ? (
                    <div className="space-y-3">
                        {selectedProposal.vendors.map((vendor: any) => (
                            <div 
                                key={vendor.id} 
                                className="bg-gray-100 p-4 rounded-lg flex justify-between items-center"
                            >
        <div>
                                    <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                                    <p className="text-gray-600">{vendor.service}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">{vendor.contactEmail}</p>
                                    <p className="text-sm text-gray-500">{vendor.contactPhone}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-600">
                        No vendor information available
                    </div>
                )}
            </div>
        );
    };
  
    const renderNavigation = () => {
        const navItems = [
            { section: 'overview', icon: RiFileTextLine, label: 'Overview' },
            { section: 'itinerary', icon: RiPlaneLine, label: 'Itinerary' },
            { section: 'payment', icon: RiWalletLine, label: 'Payments' },
            { section: 'guests', icon: RiContactsLine, label: 'Guests' },
            { section: 'vendors', icon: RiContactsLine, label: 'Vendors' },
            { section: 'services', icon: RiToolsLine, label: 'Service Requests' }
        ];    
        
        return (
            <>
                {/* Mobile Sidebar */}
                <div
                    className={`
                        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl
                        transform transition-transform duration-300 ease-in-out
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        lg:hidden
                    `}
                >
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-xl font-bold">Wedding Portal</h2>
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden"
                        >
                            <RiCloseLine className="text-2xl" />
                        </button>
                    </div>
                    
                    <nav className="p-4 space-y-2">
                        {navItems.map(({ section, icon: Icon, label }) => (
                            <button
                                key={section}
                                onClick={() => {
                                    setActiveSection(section as any);
                                    setIsSidebarOpen(false);
                                }}
                                className={`
                                    w-full flex items-center space-x-3 p-3 rounded-lg transition-colors
                                    ${activeSection === section 
                                        ? 'bg-black text-white' 
                                        : 'text-gray-700 hover:bg-gray-200'}
                                `}
                            >
                                <Icon className="text-xl" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                
                {/* Mobile Header Toggle with Profile Overlay */}
                <div className="lg:hidden p-4 flex items-center justify-between border-b relative">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-2xl"
                    >
                        <RiMenuLine />
                    </button>
                    <h1 className="text-xl font-bold">Wedding Portal</h1>
                    <button onClick={() => setIsProfileOverlayOpen(prev => !prev)} className="text-gray-600 hover:text-gray-800">
                        {user?.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} className="w-8 h-8 rounded-full" />
                        ) : (
                            <RiUserLine className="text-xl" />
                        )}
                    </button>
                    {isProfileOverlayOpen && (
                        <div ref={profileOverlayRef} className="absolute right-4 top-full mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                            <div className="p-4">
                                <div className="font-medium text-gray-900">{user?.guestFirstName}</div>
                                <div className="text-sm text-gray-500">{user?.email}</div>
                                <button onClick={handleLogout} className="mt-3 w-full text-left text-red-600 hover:text-red-800">
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Desktop Navigation */}
                <div className="hidden lg:block w-full bg-gray-100 border-b">
                    <div className="max-w-7xl mx-auto flex justify-between items-center px-4 relative">
                        <nav className="flex space-x-1 px-4">
                            {navItems.map(({ section, icon: Icon, label }) => (
                                <button
                                    key={section}
                                    onClick={() => setActiveSection(section as any)}
                                    className={`
                                        flex items-center space-x-2 px-6 py-4 transition-colors relative
                                        ${activeSection === section
                                            ? 'text-black font-medium'
                                            : 'text-gray-600 hover:text-black'}
                                    `}
                                >
                                    <Icon className="text-xl" />
                                    <span>{label}</span>
                                    {activeSection === section && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                                    )}
                                </button>
                            ))}
                        </nav>
                        <button onClick={() => setIsProfileOverlayOpen(prev => !prev)} className="flex items-center space-x-2 text-gray-600 hover:text-black">
                            {user?.profilePicture ? (
                                <img src={user.profilePicture} alt={user.name} className="w-8 h-8 rounded-full" />
                            ) : (
                                <RiUserLine className="text-xl" />
                            )}
                            <span>{user?.guestFirstName}</span>
                        </button>
                        {isProfileOverlayOpen && (
                            <div ref={profileOverlayRef} className="absolute right-4 top-full mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                                <div className="p-4">
                                    <div className="font-medium text-gray-900">{user?.guestFirstName}</div>
                                    <div className="text-sm text-gray-500">{user?.guestEmail.slice(0, 20)}...</div>
                                    <button onClick={handleLogout} className="mt-3 w-full text-left text-red-600 hover:text-red-800">
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            {renderNavigation()}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {proposals.length === 0 ? (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Welcome to Your Wedding Portal</h2>
                        <p className="text-gray-600 mb-6">You don't have any proposals yet.</p>
                        <button onClick={() => setIsGuestProposalCreationModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center mx-auto">
                            <RiAddLine className="mr-2" /> Create New Proposal
                        </button>
                    </div>
                ) : (
                    <div className="w-full">
                        {renderActiveSection()}
                    </div>
                )}
            </div>
            
            {isServiceRequestModalOpen && selectedProposal && (
                <ServiceRequestModal
                    proposalId={selectedProposal.id}
                    serviceRequestId={selectedServiceRequestId}
                    onClose={() => {
                        // Only refresh proposals list if a new service request was created
                        const isNewRequest = selectedServiceRequestId === undefined;
                        setIsServiceRequestModalOpen(false);
                        setSelectedServiceRequestId(undefined);
                        if (isNewRequest) {
                            fetchAllProposals();
                        }
                    }}
                />
            )}
            {isGuestProposalCreationModalOpen && (
                <GuestProposalCreationModal
                    onClose={() => setIsGuestProposalCreationModalOpen(false)}
                    onSuccess={fetchAllProposals}
                />
            )}
            
            {isItineraryManagementModalOpen && selectedProposal && (
                <ItineraryManagementModal
                    proposal={selectedProposal}
                    onClose={() => setIsItineraryManagementModalOpen(false)}
                    onUpdate={handleItineraryUpdate}
                />
            )}
        </div>
    );
}