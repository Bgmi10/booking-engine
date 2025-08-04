import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { baseUrl } from '../utils/constants';
import { toast } from 'react-hot-toast';

interface CalendarAvailabilityOptions {
  startDate: Date | string;
  endDate: Date | string;
  showError?: boolean;
  cacheEnabled?: boolean;
}

interface BookingStatus {
  roomId: string;
  date: string;
  status: 'available' | 'confirmed' | 'provisional' | 'blocked';
}

interface AvailabilityCache {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Shared cache across all hook instances
const availabilityCache: AvailabilityCache = {};

export function useCalendarAvailability() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper function to generate cache key
  const generateCacheKey = (startDate: string, endDate: string): string => {
    return `${startDate}_${endDate}`;
  };

  // Helper function to check if cache is valid
  const isCacheValid = (timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  // Format date consistently
  const formatDateString = (date: Date | string): string => {
    if (typeof date === 'string') {
      return date;
    }
    return format(date, 'yyyy-MM-dd');
  };

  // Fetch calendar availability
  const fetchCalendarAvailability = useCallback(async (options: CalendarAvailabilityOptions) => {
    const { 
      startDate, 
      endDate, 
      showError = true,
      cacheEnabled = true 
    } = options;

    const formattedStartDate = formatDateString(startDate);
    const formattedEndDate = formatDateString(endDate);
    const cacheKey = generateCacheKey(formattedStartDate, formattedEndDate);

    // Check cache first if enabled
    if (cacheEnabled) {
      const cachedData = availabilityCache[cacheKey];
      if (cachedData && isCacheValid(cachedData.timestamp)) {
        setData(cachedData.data);
        return cachedData.data;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Note: This endpoint doesn't require authentication
      const response = await fetch(
        `${baseUrl}/rooms/availability/calendar?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // No credentials needed for this endpoint
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar data: ${response.statusText}`);
      }

      const result = await response.json();
      const calendarData = result.data;

      // Cache the data if caching is enabled
      if (cacheEnabled && calendarData) {
        availabilityCache[cacheKey] = {
          data: calendarData,
          timestamp: Date.now(),
        };
      }

      setData(calendarData);
      return calendarData;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar data';
      setError(errorMessage);
      
      if (showError) {
        console.error('Error fetching calendar availability:', err);
        toast.error(errorMessage);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Process calendar data into booking statuses
  const processBookingStatuses = useCallback((calendarData: any, periodDates: Date[]) => {
    if (!calendarData || !calendarData.availableRooms) {
      return [];
    }

    const statuses: BookingStatus[] = [];

    calendarData.availableRooms.forEach((room: any) => {
      periodDates.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        let status: 'available' | 'confirmed' | 'provisional' | 'blocked' = 'available';
        
        if (room.bookedDates?.includes(dateStr)) {
          status = 'confirmed';
        } else if (room.restrictedDates?.includes(dateStr)) {
          status = 'blocked';
        } else if (calendarData.partiallyBookedDates?.includes(dateStr)) {
          status = 'provisional';
        }
        
        statuses.push({
          roomId: room.id,
          date: dateStr,
          status
        });
      });
    });

    return statuses;
  }, []);

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    Object.entries(availabilityCache).forEach(([key, value]) => {
      if (!isCacheValid(value.timestamp)) {
        delete availabilityCache[key];
      }
    });
  }, []);

  return {
    loading,
    data,
    error,
    fetchCalendarAvailability,
    processBookingStatuses,
    cleanupCache,
  };
}