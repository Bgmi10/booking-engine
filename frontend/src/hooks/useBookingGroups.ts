import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/constants';
import toast from 'react-hot-toast';
import type { BookingGroup, BookingGroupAuditLog } from '../types/types';

export function useBookingGroups() {
  const [bookingGroups, setBookingGroups] = useState<BookingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${baseUrl}/admin/booking-groups`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch booking groups');
      }

      const data = await response.json();
      setBookingGroups(data.data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching booking groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const createBookingGroup = async (data: {
    groupName: string;
    paymentIntentIds: string[];
    reason?: string;
  }) => {
    try {
      const response = await fetch(`${baseUrl}/admin/booking-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking group');
      }

      const result = await response.json();
      toast.success('Booking group created successfully');
      await fetchBookingGroups();
      return result.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateBookingGroup = async (groupId: string, data: {
    groupName: string;
    reason?: string;
  }) => {
    try {
      const response = await fetch(`${baseUrl}/admin/booking-groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update booking group');
      }

      const result = await response.json();
      toast.success('Booking group updated successfully');
      await fetchBookingGroups();
      return result.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteBookingGroup = async (groupId: string, reason?: string) => {
    try {
      const response = await fetch(`${baseUrl}/admin/booking-groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete booking group');
      }

      toast.success('Booking group deleted successfully');
      await fetchBookingGroups();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const addPaymentIntentsToGroup = async (groupId: string, paymentIntentIds: string[], reason?: string) => {
    try {
      const response = await fetch(`${baseUrl}/admin/booking-groups/${groupId}/payment-intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentIntentIds, reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add payment intents to group');
      }

      const result = await response.json();
      toast.success(`Added ${result.data.addedCount} payment intents to group`);
      await fetchBookingGroups();
      return result.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const removePaymentIntentsFromGroup = async (paymentIntentIds: string[], reason?: string, keepCharges: boolean = false) => {
    try {
      const response = await fetch(`${baseUrl}/admin/booking-groups/remove-payment-intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentIntentIds, reason, keepCharges }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove payment intents from group');
      }

      const result = await response.json();
      let message = `Removed ${result.data.removedCount} booking${result.data.removedCount !== 1 ? 's' : ''} from group`;
      if (keepCharges) {
        message += ' (orders kept)';
      } else if (result.data.deletedOrdersCount > 0) {
        message += ` (${result.data.deletedOrdersCount} order${result.data.deletedOrdersCount !== 1 ? 's' : ''} deleted)`;
      }
      toast.success(message);
      await fetchBookingGroups();
      return result.data;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const fetchGroupAuditLogs = async (groupId: string): Promise<BookingGroupAuditLog[]> => {
    try {
      const response = await fetch(`${baseUrl}/admin/booking-groups/${groupId}/audit-logs`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      return data.data || [];
    } catch (err: any) {
      console.error('Error fetching group audit logs:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBookingGroups();
  }, []);

  return {
    bookingGroups,
    loading,
    error,
    refetch: fetchBookingGroups,
    createBookingGroup,
    updateBookingGroup,
    deleteBookingGroup,
    addPaymentIntentsToGroup,
    removePaymentIntentsFromGroup,
    fetchGroupAuditLogs,
  };
}