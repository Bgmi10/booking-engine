import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/constants';
import type { BookingRestriction } from '../types/types';

export interface UseBookingRestrictionsResult {
  restrictions: BookingRestriction[];
  loading: boolean;
  error: string | null;
  fetchRestrictions: () => Promise<void>;
  createRestriction: (restriction: Omit<BookingRestriction, 'id'>) => Promise<boolean>;
  updateRestriction: (id: string, restriction: Partial<BookingRestriction>) => Promise<boolean>;
  deleteRestriction: (id: string) => Promise<boolean>;
}

export const useBookingRestrictions = (): UseBookingRestrictionsResult => {
  const [restrictions, setRestrictions] = useState<BookingRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestrictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/admin/bookings/restrictions/all`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking restrictions');
      }
      
      const data = await response.json();
      setRestrictions(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch booking restrictions';
      setError(errorMessage);
      console.error('Error fetching booking restrictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRestriction = async (restriction: Omit<BookingRestriction, 'id'>): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`${baseUrl}/admin/bookings/restrictions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restriction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking restriction');
      }
      
      // Refresh the list
      await fetchRestrictions();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create booking restriction';
      setError(errorMessage);
      return false;
    }
  };

  const updateRestriction = async (id: string, restriction: Partial<BookingRestriction>): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`${baseUrl}/admin/bookings/restrictions/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restriction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update booking restriction');
      }
      
      // Refresh the list
      await fetchRestrictions();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update booking restriction';
      setError(errorMessage);
      return false;
    }
  };

  const deleteRestriction = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`${baseUrl}/admin/bookings/restrictions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete booking restriction');
      }
      
      // Refresh the list
      await fetchRestrictions();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete booking restriction';
      setError(errorMessage);
      return false;
    }
  };

  useEffect(() => {
    fetchRestrictions();
  }, []);

  return {
    restrictions,
    loading,
    error,
    fetchRestrictions,
    createRestriction,
    updateRestriction,
    deleteRestriction,
  };
};

export default useBookingRestrictions;