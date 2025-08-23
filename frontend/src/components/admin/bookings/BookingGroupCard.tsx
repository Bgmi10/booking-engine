import { useState } from 'react';
import {
  Eye,
  History,
  Edit,
  Trash2,
  CreditCard,
  ShoppingBag,
  DollarSign,
  Badge
} from 'lucide-react';
import { format } from 'date-fns';
import type { BookingGroup } from '../../../types/types';
import { formatCurrency } from '../../../utils/helper';
import { baseUrl } from '../../../utils/constants';
import BookingGroupAuditModal from './BookingGroupAuditModal';
import DeleteConfirmationModal from '../../ui/DeleteConfirmationModal';
import toast from 'react-hot-toast';

interface BookingGroupCardProps {
  group: BookingGroup;
  onViewBookings: (group: BookingGroup) => void;
  onEdit: (group: BookingGroup) => void;
  onRefresh: () => void;
}

export default function BookingGroupCard({
  group,
  onViewBookings,
  onEdit,
  onRefresh,
}: BookingGroupCardProps) {
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalBookings = group.paymentIntents.reduce(
    (sum, pi) => sum + pi.bookings.length,
    0
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

          {/* Group Members Summary */}
          {/* <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Group Bookings ({group._count.paymentIntents})</h4>
            <div className="grid gap-2">
              {group.paymentIntents.slice(0, expanded ? undefined : 3).map((pi) => (
                <div key={pi.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {pi.customer 
                          ? `${pi.customer.guestFirstName} ${pi.customer.guestLastName}` 
                          : 'Unknown Customer'
                        }
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        pi.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 
                        pi.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {pi.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      #{generateMergedBookingId(pi.bookings.map(booking => booking.id))} • {pi.bookings.length} booking{pi.bookings.length !== 1 ? 's' : ''}
                      {pi.bookings.length > 0 && (
                        <span className="text-gray-500">
                          {' '}({pi.bookings.map(b => b.room.name).join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(pi.totalAmount)}</div>
                    <div className={`text-xs ${(pi.outstandingAmount || 0) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                      Outstanding: {formatCurrency(pi.outstandingAmount || 0)}
                    </div>
                  </div>
                </div>
              ))}
              
              {group.paymentIntents.length > 3 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors py-2"
                >
                  <span>
                    {expanded ? 'Show Less' : `Show ${group.paymentIntents.length - 3} More`}
                  </span>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div> */}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onViewBookings(group)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </button>

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
    </>
  );
}