import { useState } from 'react';
import { baseUrl } from '../utils/constants';
import toast from 'react-hot-toast';

interface AddParticipantData {
  customerId: string;
  bookingId: string;
  enhancementId: string;
  paymentIntentId?: string;
  reason?: string;
  notes?: string;
}

interface RemoveParticipantData {
  reason?: string;
  notes?: string;
}

export const useEventParticipants = () => {
  const [loading, setLoading] = useState(false);

  const addParticipant = async (eventId: string, data: AddParticipantData) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/events/${eventId}/participants`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add participant');
      }
      
      const result = await response.json();
      toast.success('Participant added successfully');
      return result.data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add participant');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeParticipant = async (eventId: string, participantId: string, data?: RemoveParticipantData) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/events/${eventId}/participants/${participantId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data || {}),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove participant');
      }
      
      toast.success('Participant removed successfully');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove participant');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getEventsByPaymentIntent = async (paymentIntentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/events/payment-intent/${paymentIntentId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      toast.error(error.message || "Failed to load events");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const searchCustomersForEvent = async (eventId: string, search?: string) => {
    try {
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${baseUrl}/admin/events/${eventId}/search-customers${queryParams}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to search customers");
      }

      const data = await response.json();
      return data.data || [];
    } catch (error: any) {
      toast.error(error.message || "Failed to search customers");
      throw error;
    }
  };

  return {
    loading,
    addParticipant,
    removeParticipant,
    getEventsByPaymentIntent,
    searchCustomersForEvent,
  };
};