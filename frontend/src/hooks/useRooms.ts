import { useState, useCallback } from 'react';
import { baseUrl } from '../utils/constants';
import { useCalendarAvailability } from './useCalendarAvailability';
import { fetchRatePoliciesWithPricing } from './useRatePolicies';
import toast from 'react-hot-toast';
import type { Room } from '../types/types';

interface UseRoomsProps {
  onRoomsLoad?: (rooms: Room[]) => void;
  showToastOnError?: boolean;
}

interface UseRoomsReturn {
  rooms: Room[];
  loadingRooms: boolean;
  ratePoliciesWithPricing: any[];
  fetchRoomsAndPricing: (startDate?: string, endDate?: string) => Promise<void>;
  refreshRatePricingForDates: (startDate: string, endDate: string) => Promise<void>;
}

export function useRooms({ 
  onRoomsLoad, 
  showToastOnError = true 
}: UseRoomsProps = {}): UseRoomsReturn {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [ratePoliciesWithPricing, setRatePoliciesWithPricing] = useState<any[]>([]);

  const { fetchCalendarAvailability: fetchCalendarAvailabilityHook } = useCalendarAvailability();

  // Handler to refresh rate policies with pricing when dates change
  const refreshRatePricingForDates = useCallback(async (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      try {
        const policiesWithPricing = await fetchRatePoliciesWithPricing(startDate, endDate, true);
        setRatePoliciesWithPricing(policiesWithPricing);
      } catch (error) {
        console.error('Error in refreshRatePricingForDates:', error);
      }
    }
  }, []);

  // Fetch rooms from calendar API data and load rate policies with pricing
  const fetchRoomsAndPricing = useCallback(async (startDate?: string, endDate?: string) => {
    setLoadingRooms(true);
    try {
      // Use calendar API to get room data instead of separate rooms/all call
      let calendarData;
      if (startDate && endDate) {
        calendarData = await fetchCalendarAvailabilityHook({
          startDate,
          endDate,
          showError: true,
          cacheEnabled: false
        });
      }

      // Extract rooms from calendar data or use fallback
      let roomsData = [];
      if (calendarData?.rooms) {
        roomsData = calendarData.rooms;
      } else {
        // Fallback to direct rooms API if calendar doesn't provide room data
        const res = await fetch(`${baseUrl}/admin/rooms/all`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch rooms");
        }
        const data = await res.json();
        roomsData = data.data;
      }
      
      setRooms(roomsData);
      
      // Fetch rate policies with date-specific pricing if dates are provided
      if (startDate && endDate) {
        try {
          const policiesWithPricing = await fetchRatePoliciesWithPricing(startDate, endDate, true);
          setRatePoliciesWithPricing(policiesWithPricing);
        } catch (error) {
          console.error('Error fetching rate policies with pricing:', error);
          setRatePoliciesWithPricing([]);
        } 
      }

      // Call onRoomsLoad callback if provided
      if (onRoomsLoad && roomsData.length > 0) {
        onRoomsLoad(roomsData);
      }
    } catch (error) {
      console.error("Error fetching rooms and pricing:", error);
      if (showToastOnError) {
        toast.error("Failed to load rooms. Please try again.");
      }
    } finally {
      setLoadingRooms(false);
    }
  }, [fetchCalendarAvailabilityHook, onRoomsLoad, showToastOnError]);

  return {
    rooms,
    loadingRooms,
    ratePoliciesWithPricing,
    fetchRoomsAndPricing,
    refreshRatePricingForDates,
  };
}