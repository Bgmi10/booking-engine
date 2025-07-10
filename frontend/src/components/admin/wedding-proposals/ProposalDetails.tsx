import React, { useEffect, useState } from 'react';
import { RiCalendarLine, RiGroupLine, RiEdit2Line, RiMailSendLine, RiFileDownloadLine, RiPrinterLine, RiInformationLine, RiAddLine, RiMessage3Line } from 'react-icons/ri';
import toast from 'react-hot-toast';
import type { ItineraryDay, WeddingProposal, WeddingServiceRequest } from '../../../types/types';
import { baseUrl } from '../../../utils/constants';
import PaymentPlanEditor from './PaymentPlanEditor';
import { ServiceRequestManagementModal } from './ServiceRequestManagementModal';

type ProposalDetailsProps = {
  proposal: WeddingProposal;
  onEditDay: (day: ItineraryDay) => void;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onProposalUpdate: (updatedProposal: WeddingProposal) => void;
  loading: boolean;
};

const ProposalDetails: React.FC<ProposalDetailsProps> = ({
  proposal,
  onEditDay,
  onUpdateStatus,
  onProposalUpdate,
  loading: parentLoading
}) => {
  const [showPaymentPlan, setShowPaymentPlan] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<string | null>(null);
  const [serviceRequests, setServiceRequests] = useState<WeddingServiceRequest[]>(proposal.serviceRequests || []);
  const [loadingServiceRequests, setLoadingServiceRequests] = useState(false);

  // Fetch service requests for this proposal
  const fetchServiceRequests = async () => {
    setLoadingServiceRequests(true);
    try {
      const response = await fetch(`${baseUrl}/admin/proposals/${proposal.id}/service-requests`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok) {
        setServiceRequests(data.data);
      } else {
        throw new Error(data.message || 'Failed to load service requests');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while loading service requests');
    } finally {
      setLoadingServiceRequests(false);
    }
  };

  // Load service requests on mount
  useEffect(() => {
    fetchServiceRequests();
  }, [proposal.id]);

  const handleSendProposal = async () => {
    try {
      setSendingEmail(true);
      const customerPortalUrl = `${window.location.origin}/client/proposals/${proposal.id}`;
      
      const response = await fetch(`${baseUrl}/admin/wedding-proposals/${proposal.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ customerPortalUrl })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to send proposal');
        return;
      }

      const result = await response.json();
      toast.success('Proposal sent successfully!');
      
      // Update the proposal with new email count
      onProposalUpdate({
        ...proposal,
        sentEmailCount: result.data.sentEmailCount,
        lastEmailSentAt: result.data.lastEmailSentAt
      });
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast.error('Failed to send proposal');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExportPdf = () => {
    // Open the PDF in a new tab
    window.open(`${baseUrl}/admin/wedding-proposals/${proposal.id}/pdf`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const calculateTotalPrice = () => {
    return proposal.itineraryDays.reduce((total, day) => {
      const dayTotal = day.items.reduce((sum, item) => sum + item.price, 0);
      return total + dayTotal;
    }, 0);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      CONFIRMED: 'bg-emerald-100 text-emerald-800',
      COMPLETED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      QUOTED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100'}`}>
        {status.toLowerCase().replace('_', ' ')}
      </span>
    );
  };

  // Handle opening a service request for management
  const handleOpenServiceRequest = (requestId: string) => {
    setSelectedServiceRequest(requestId);
  };

  // Handle closing the service request management modal
  const handleCloseServiceRequestModal = () => {
    setSelectedServiceRequest(null);
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{proposal.name}</h1>
            <div className="flex items-center text-gray-500 mt-1">
              <RiCalendarLine className="mr-1" /> Wedding Date: {formatDate(proposal.weddingDate)}
              <span className="mx-2">•</span>
              <RiGroupLine className="mr-1" /> Guests: {proposal.mainGuestCount}
              <span className="mx-2">•</span>
              {getStatusBadge(proposal.status)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <button
              onClick={handleSendProposal}
              disabled={sendingEmail || parentLoading}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm flex items-center"
            >
              <RiMailSendLine className="mr-1" />
              {sendingEmail ? 'Sending...' : 'Send Proposal'}
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm flex items-center"
            >
              <RiFileDownloadLine className="mr-1" /> Export PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm flex items-center"
            >
              <RiPrinterLine className="mr-1" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Notification System Info */}
      <div className="mb-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <RiInformationLine className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Automatic Customer Notifications</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>When you make changes to the itinerary, the customer will be automatically notified via email.</p>
                <p className="mt-1">This helps keep customers informed about any updates to their wedding plans in real-time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Email Stats Section */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Email Status</h2>
          </div>
          <div className="p-4">
            <div className="text-sm text-gray-600">
              <p>Sent {proposal.sentEmailCount} time{proposal.sentEmailCount !== 1 ? 's' : ''}</p>
              {proposal.lastEmailSentAt && (
                <p className="mt-1">Last sent: {new Date(proposal.lastEmailSentAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Itinerary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Itinerary</h2>
            </div>
            
            <div className="p-4">
              {proposal.itineraryDays.map((day) => (
                <div key={day.id} className="mb-6 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">
                      Day {day.dayNumber} - {formatDate(day.date)}
                    </h3>
                    <button
                      onClick={() => onEditDay(day)}
                      className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                    >
                      <RiEdit2Line className="mr-1" /> Edit Items
                    </button>
                  </div>

                  {day.items.length > 0 ? (
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      {day.items.map((item) => (
                        <li key={item.id} className="p-3">
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              <div className="text-sm text-gray-500">
                                Guests: {item.guestCount} • Status: {item.status}
                              </div>
                              {item.notes && <div className="text-sm italic mt-1">{item.notes}</div>}
                            </div>
                            <div className="text-right">
                              <div className="font-medium">€{item.price.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">
                                {item.product.pricingModel === 'PER_PERSON' 
                                  ? `€${item.product.price.toFixed(2)} per person`
                                  : 'Fixed price'
                                }
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 border border-gray-200 rounded-lg text-center text-gray-500">
                      No items added for this day
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Terms and Conditions */}
          {proposal.termsAndConditions && (
            <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Terms & Conditions</h2>
              </div>
              <div className="p-4 prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans">{proposal.termsAndConditions}</pre>
              </div>
            </div>
          )}
          
          {/* Custom Service Requests */}
          <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Custom Service Requests</h2>
            </div>
            <div className="p-4">
              {loadingServiceRequests ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                </div>
              ) : serviceRequests.length > 0 ? (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  {serviceRequests.map((request) => (
                    <li key={request.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{request.title}</div>
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">{request.description}</div>
                          <div className="mt-2 flex items-center">
                            {getStatusBadge(request.status)}
                            {request.price && (
                              <span className="ml-2 text-sm font-medium">€{request.price.toFixed(2)}</span>
                            )}
                            {request.messages && request.messages.length > 0 && (
                              <span className="ml-2 text-xs text-gray-500 flex items-center">
                                <RiMessage3Line className="mr-1" /> {request.messages.length} message{request.messages.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenServiceRequest(request.id)}
                          className="ml-4 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
                        >
                          Manage
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 border border-gray-200 rounded-lg text-center text-gray-500">
                  No custom service requests yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Customer Info, Summary, Status */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
            </div>
            <div className="p-4">
              <div className="text-lg font-medium">
                {proposal.customer.guestFirstName} {proposal.customer.guestLastName}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {proposal.customer.guestEmail}
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Price Summary</h2>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {proposal.itineraryDays.map((day) => {
                  const dayTotal = day.items.reduce((sum, item) => sum + item.price, 0);
                  return (
                    <div key={day.id} className="flex justify-between text-sm">
                      <span>Day {day.dayNumber}</span>
                      <span>€{dayTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-semibold">
                <span>Total</span>
                <span>€{calculateTotalPrice().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Status</h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Current:</span>
                <span>{getStatusBadge(proposal.status)}</span>
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                <select
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={proposal.status}
                  onChange={(e) => onUpdateStatus(proposal.id, e.target.value)}
                  disabled={parentLoading}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Plan */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Payment Plan</h2>
              <button
                onClick={() => setShowPaymentPlan(!showPaymentPlan)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                {showPaymentPlan ? 'Hide' : 'Edit'}
              </button>
            </div>
            <div className="p-4">
              {showPaymentPlan ? (
                <PaymentPlanEditor 
                  proposalId={proposal.id} 
                  weddingDate={proposal.weddingDate}
                  totalAmount={calculateTotalPrice()}
                  proposalName={proposal.name}
                />
              ) : (
                <div 
                  onClick={() => setShowPaymentPlan(true)} 
                  className="p-3 bg-blue-50 text-blue-700 rounded-lg text-center cursor-pointer hover:bg-blue-100"
                >
                  Click to {proposal.paymentPlan ? 'view' : 'create'} payment plan
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service Request Management Modal */}
      {selectedServiceRequest && (
        <ServiceRequestManagementModal
          proposalId={proposal.id}
          serviceRequestId={selectedServiceRequest}
          onClose={handleCloseServiceRequestModal}
          onUpdate={fetchServiceRequests}
        />
      )}

    </div>
  );
};

export default ProposalDetails; 