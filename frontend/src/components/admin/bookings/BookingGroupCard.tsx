import { useState } from 'react';
import {
  Eye,
  History,
  Edit,
  Trash2,
  CreditCard,
  ShoppingBag,
  DollarSign,
  Badge,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import type { BookingGroup } from '../../../types/types';
import { formatCurrency } from '../../../utils/helper';
import { baseUrl } from '../../../utils/constants';
import BookingGroupAuditModal from './BookingGroupAuditModal';
import DeleteConfirmationModal from '../../ui/DeleteConfirmationModal';
import ManualCheckInButton, { useCheckInAvailability } from './ManualCheckInButton';
import AdminCheckInAccessButton, { useAdminCheckInAccess } from './AdminCheckInAccessButton';
import PaymentIntentSelectionModal from './PaymentIntentSelectionModal';
import toast from 'react-hot-toast';

interface BookingGroupCardProps {
  group: BookingGroup | BookingGroup[];
  onViewBookings: (group: BookingGroup) => void;
  onEdit: (group: BookingGroup) => void;
  onRefresh: () => void;
  isMergedView?: boolean;
  onViewPaymentIntent?: (paymentIntent: any) => void;
}

/**
 * Main component that handles both single BookingGroup and arrays
 */
export default function BookingGroupCard({
  group,
  onViewBookings,
  onEdit,
  onRefresh,
  isMergedView = false,
  onViewPaymentIntent,
}: BookingGroupCardProps) {
  // Normalize to array to handle both cases
  const groups = Array.isArray(group) ? group : [group];
  
  // Render a card for each group
  return (
    <>
      {groups.map((singleGroup) => (
        <SingleBookingGroupCard
          key={singleGroup.id}
          group={singleGroup}
          onViewBookings={onViewBookings}
          onEdit={onEdit}
          onRefresh={onRefresh}
          isMergedView={isMergedView}
          onViewPaymentIntent={onViewPaymentIntent}
        />
      ))}
    </>
  );
}

/**
 * Component that renders a single BookingGroup card
 */
interface SingleBookingGroupCardProps {
  group: BookingGroup; // Always a single object
  onViewBookings: (group: BookingGroup) => void;
  onEdit: (group: BookingGroup) => void;
  onRefresh: () => void;
  isMergedView?: boolean;
  onViewPaymentIntent?: (paymentIntent: any) => void;
}

function SingleBookingGroupCard({
  group,
  onViewBookings,
  onEdit,
  onRefresh,
  isMergedView = false,
  onViewPaymentIntent,
}: SingleBookingGroupCardProps) {
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [showPaymentIntentSelection, setShowPaymentIntentSelection] = useState(false);

  const totalBookings = group.paymentIntents.reduce(
    (sum, pi) => sum + pi.bookings.length,
    0
  );

  // Check if manual check-in should be available for this booking group
  // Get the earliest check-in date from all bookings in all payment intents
  const earliestCheckIn = group.paymentIntents.reduce((earliest: string | null, pi) => {
    if (pi.bookings && pi.bookings.length > 0) {
      const piEarliest = pi.bookings.reduce((piEarly: string, booking: any) => 
        new Date(booking.checkIn) < new Date(piEarly) ? booking.checkIn : piEarly,
        pi.bookings[0].checkIn
      );
      return !earliest || new Date(piEarliest) < new Date(earliest) ? piEarliest : earliest;
    }
    return earliest;
  }, null);

  // Check if there's at least one confirmed payment intent
  const hasConfirmedBookings = group.paymentIntents.some(pi => pi.status === 'SUCCEEDED');
  
  const { isAvailable: isCheckInAvailable } = useCheckInAvailability(
    hasConfirmedBookings ? 'CONFIRMED' : 'PENDING',
    earliestCheckIn
  );

  const { isAvailable: isAdminAccessAvailable } = useAdminCheckInAccess(
    hasConfirmedBookings ? 'SUCCEEDED' : 'PENDING'
  );

  const getStatusColor = (outstandingAmount?: number) => {
    if (!outstandingAmount || outstandingAmount <= 0) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (outstandingAmount?: number) => {
    if (!outstandingAmount || outstandingAmount <= 0) {
      return 'Fully Paid';
    }
    return 'Outstanding';
  };

  const handleDelete = async (reason?: string) => {
    if (!reason?.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${baseUrl}/admin/booking-groups/${group.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason.trim()
        })
      });

      if (response.ok) {
        toast.success('Booking group deleted successfully');
        setShowDeleteModal(false);
        onRefresh();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete booking group');
      }
    } catch (error) {
      console.error('Error deleting booking group:', error);
      toast.error('Failed to delete booking group');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendInvoice = async () => {
    setIsSendingInvoice(true);
    try {
      const response = await fetch(`${baseUrl}/admin/customers/send-group-invoice`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingGroupId: group.id }),
      });

      if (response.ok) {
        toast.success('Group invoice sent successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send group invoice');
      }
    } catch (error: any) {
      console.error('Error sending group invoice:', error);
      toast.error(error.message || 'Failed to send group invoice');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {group.groupName || `Group ${group.id.slice(0, 8)}`}
                </h3>
                {group.isAutoGrouped && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Badge className="h-3 w-3 mr-1" />
                    Auto
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(group.outstandingAmount)}`}>
                  <DollarSign className="h-3 w-3 mr-1" />
                  {getStatusText(group.outstandingAmount)}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    {group._count.charges} charges
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="h-4 w-4" />
                    {group._count.orders} orders
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Created: {format(new Date(group.createdAt), 'MMM dd, yyyy • HH:mm')}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">
                {totalBookings} booking{totalBookings !== 1 ? 's' : ''}
              </div>
              {/* Outstanding Balance */}
              {(() => {
                const outstandingAmount = group.outstandingAmount || 0;
                
                return (
                  <div className={`mt-2 p-2 rounded-md ${outstandingAmount > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className={`text-xs mb-1 ${outstandingAmount > 0 ? 'text-amber-700' : 'text-gray-600'}`}>Outstanding Amount:</div>
                    <div className={`text-lg font-bold ${outstandingAmount > 0 ? 'text-amber-900' : 'text-gray-700'}`}>
                      {formatCurrency(outstandingAmount)}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                if (isMergedView && group.paymentIntents.length === 1 && onViewPaymentIntent) {
                  // In merged view with single payment intent, show payment intent details
                  onViewPaymentIntent(group.paymentIntents[0]);
                } else {
                  // Otherwise show group modal
                  onViewBookings(group);
                }
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </button>

            {/* Manual Check-In Button */}
            {isCheckInAvailable && (
              <ManualCheckInButton
                type="bookingGroup"
                id={group.id}
                disabled={isDeleting || isSendingInvoice}
                variant="secondary"
                size="sm"
                label="Send Group Check-In"
              />
            )}

            {/* Admin Access Check-In Portal Button */}
            {isAdminAccessAvailable && (
              <button
                onClick={() => setShowPaymentIntentSelection(true)}
                disabled={isDeleting || isSendingInvoice}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                Access Portal
              </button>
            )}

            <button
              onClick={() => setShowAuditLogs(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <History className="h-4 w-4 mr-1" />
              Audit Logs
            </button>

            <button
              onClick={() => onEdit(group)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </button>

            <button
              onClick={handleSendInvoice}
              disabled={isSendingInvoice}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Mail className="h-4 w-4 mr-1" />
              {isSendingInvoice ? 'Sending...' : 'Send Invoice'}
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {showAuditLogs && (
        <BookingGroupAuditModal
          isOpen={showAuditLogs}
          onClose={() => setShowAuditLogs(false)}
          groupId={group.id}
          groupName={group.groupName}
          fetchAuditLogs={async () => {
            const response = await fetch(`${baseUrl}/admin/booking-groups/${group.id}/audit-logs`, {
              credentials: 'include',
            });
            const data = await response.json();
            return data.data || [];
          }}
        />
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Booking Group"
        itemName={group.groupName || `Group ${group.id.slice(0, 8)}`}
        message={`Are you sure you want to delete "${group.groupName || `Group ${group.id.slice(0, 8)}`}"? This will remove the group and all its associations. This action cannot be undone.`}
        isLoading={isDeleting}
        confirmButtonText="Delete Group"
        requireReason={true}
        reasonLabel="Reason for deletion"
        reasonPlaceholder="Please explain why you are deleting this booking group (e.g., duplicate entry, test data, customer request, etc.)"
      />

      <PaymentIntentSelectionModal
        isOpen={showPaymentIntentSelection}
        onClose={() => setShowPaymentIntentSelection(false)}
        bookingGroup={group}
      />
    </>
  );
}