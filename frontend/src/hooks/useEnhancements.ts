import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/constants';
import type { Enhancement } from '../types/types';

interface UseEnhancementsProps {
    days?: string[]; // Days in range for filtering seasonal enhancements
    bookingId?: string; // Optional booking ID if enhancements are booking-specific
    enabled?: boolean; // Whether to fetch enhancements or not
}

interface UseEnhancementsReturn {
    enhancements: Enhancement[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    addEnhancement: (enhancement: Enhancement) => void;
    removeEnhancement: (enhancementId: string) => void;
    selectedEnhancements: Enhancement[];
    clearSelectedEnhancements: () => void;
}

export const useEnhancements = ({
    days = [],
    bookingId,
    enabled = true
}: UseEnhancementsProps = {}): UseEnhancementsReturn => {
    const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
    const [selectedEnhancements, setSelectedEnhancements] = useState<Enhancement[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEnhancements = async () => {
        if (!enabled) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const endpoint = days.length > 0 
                ? `/enhancements` // POST endpoint for days filtering
                : `/admin/enhancements/all`; // GET endpoint for all enhancements

            const requestConfig: RequestInit = {
                method: days.length > 0 ? 'POST' : 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            // Add body for POST request with days filtering
            if (days.length > 0) {
                requestConfig.body = JSON.stringify({
                    days: days,
                    ...(bookingId && { bookingId })
                });
            }

            const response = await fetch(`${baseUrl}${endpoint}`, requestConfig);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch enhancements');
            }

            setEnhancements(data.data || []);
        } catch (err) {
            console.error('Error fetching enhancements:', err);
            setError(err instanceof Error ? err.message : 'Failed to load enhancements');
        } finally {
            setLoading(false);
        }
    };

    const addEnhancement = (enhancement: Enhancement) => {
        setSelectedEnhancements(prev => {
            // Check if enhancement is already selected
            const exists = prev.find(e => e.id === enhancement.id);
            if (!exists) {
                return [...prev, enhancement];
            }
            return prev;
        });
    };

    const removeEnhancement = (enhancementId: string) => {
        setSelectedEnhancements(prev => 
            prev.filter(enhancement => enhancement.id !== enhancementId)
        );
    };

    const clearSelectedEnhancements = () => {
        setSelectedEnhancements([]);
    };

    const refetch = async () => {
        await fetchEnhancements();
    };

    // Fetch enhancements when dependencies change
    useEffect(() => {
        fetchEnhancements();
    }, [days.join(','), bookingId, enabled]);

    return {
        enhancements,
        loading,
        error,
        refetch,
        addEnhancement,
        removeEnhancement,
        selectedEnhancements,
        clearSelectedEnhancements
    };
};

// Helper hook specifically for online check-in enhancements
export const useOnlineCheckInEnhancements = (
    availableEnhancements: Enhancement[],
    bookingDates?: { checkIn: string; checkOut: string }
) => {
    const [selectedEnhancements, setSelectedEnhancements] = useState<Enhancement[]>([]);
    
    // Filter enhancements based on booking dates and seasonal availability
    const filteredEnhancements = availableEnhancements.filter(enhancement => {
        if (!enhancement.seasonal) return true;
        
        if (!bookingDates || !enhancement.seasonStart || !enhancement.seasonEnd) return true;
        
        const checkInDate = new Date(bookingDates.checkIn);
        const seasonStart = new Date(enhancement.seasonStart);
        const seasonEnd = new Date(enhancement.seasonEnd);
        
        return checkInDate >= seasonStart && checkInDate <= seasonEnd;
    });

    const addEnhancement = (enhancement: Enhancement) => {
        setSelectedEnhancements(prev => {
            const exists = prev.find(e => e.id === enhancement.id);
            if (!exists) {
                return [...prev, enhancement];
            }
            return prev;
        });
    };

    const removeEnhancement = (enhancementId: string) => {
        setSelectedEnhancements(prev => 
            prev.filter(enhancement => enhancement.id !== enhancementId)
        );
    };

    const clearSelectedEnhancements = () => {
        setSelectedEnhancements([]);
    };

    const calculateTotalPrice = (guestCount: number = 1) => {
        return selectedEnhancements.reduce((total, enhancement) => {
            let price = enhancement.price;
            if (enhancement.pricingType === 'PER_GUEST') {
                price *= guestCount;
            }
            return total + price;
        }, 0);
    };

    return {
        enhancements: filteredEnhancements,
        selectedEnhancements,
        addEnhancement,
        removeEnhancement,
        clearSelectedEnhancements,
        calculateTotalPrice
    };
};