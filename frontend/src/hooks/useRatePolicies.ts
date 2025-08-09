import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../utils/constants';
import type { RatePolicy } from '../types/types';

interface UseRatePoliciesOptions {
  fetchOnMount?: boolean;
  showError?: boolean;
}

interface UseRatePoliciesReturn {
  ratePolicies: RatePolicy[];
  loading: boolean;
  error: string | null;
  fetchRatePolicies: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useRatePolicies(options: UseRatePoliciesOptions = {}): UseRatePoliciesReturn {
  const { fetchOnMount = true, showError = true } = options;
  
  const [ratePolicies, setRatePolicies] = useState<RatePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRatePolicies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/admin/rate-policies/all`, {
        credentials: 'include',
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch rate policies');
      }

      setRatePolicies(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rate policies';
      setError(errorMessage);
      
      if (showError) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const refetch = fetchRatePolicies;

  useEffect(() => {
    if (fetchOnMount) {
      fetchRatePolicies();
    }
  }, [fetchOnMount]);

  return {
    ratePolicies,
    loading,
    error,
    fetchRatePolicies,
    refetch,
  };
}

// Helper function to get active rate policies only
export function useActiveRatePolicies(options: UseRatePoliciesOptions = {}) {
  const result = useRatePolicies(options);
  
  return {
    ...result,
    ratePolicies: result.ratePolicies.filter(policy => policy.isActive),
  };
}

// Helper function to get rate policies with their date-specific pricing data
export async function fetchRatePolicyWithPricing(
  ratePolicyId: string,
  startDate: string,
  endDate: string
): Promise<RatePolicy | null> {
  try {
    const url = `${baseUrl}/admin/rate-policies/${ratePolicyId}/date-prices?startDate=${startDate}&endDate=${endDate}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch rate policy with pricing');
    }

    return data.data;
  } catch (err) {
    console.error('Error fetching rate policy with pricing:', err);
    return null;
  }
}

// Helper function to get all rate policies with date-specific pricing
export async function fetchRatePoliciesWithPricing(
  startDate: string,
  endDate: string,
  showError: boolean = true
): Promise<RatePolicy[]> {
  try {
    // First, get all active rate policies
    const ratePoliciesResponse = await fetch(`${baseUrl}/admin/rate-policies/all`, {
      credentials: 'include',
    });
    
    const ratePoliciesData = await ratePoliciesResponse.json();
    
    if (!ratePoliciesResponse.ok) {
      throw new Error(ratePoliciesData.message || 'Failed to fetch rate policies');
    }
    
    const ratePolicies = ratePoliciesData.data || [];
    
    // Fetch date-specific pricing for each active rate policy
    const ratePoliciesWithPricing = await Promise.all(
      ratePolicies
        .filter((policy: RatePolicy) => policy.isActive)
        .map(async (policy: RatePolicy) => {
          try {
            const pricingData = await fetchRatePolicyWithPricing(policy.id, startDate, endDate);
            
            if (pricingData && Array.isArray(pricingData)) {
              // The API returns an array of pricing data, we need to attach it to the policy
              return {
                ...policy,
                rateDatePrices: pricingData
              };
            } else if (pricingData && pricingData.rateDatePrices) {
              // If the API already returns the policy with rateDatePrices
              return pricingData;
            } else {
              // No pricing data, return policy with empty rateDatePrices
              return {
                ...policy,
                rateDatePrices: []
              };
            }
          } catch (error) {
            console.error(`Error fetching pricing for policy ${policy.id}:`, error);
            // If pricing fetch fails, return the original policy with empty rateDatePrices
            return {
              ...policy,
              rateDatePrices: []
            };
          }
        })
    );
    
    return ratePoliciesWithPricing;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rate policies with pricing';
    
    if (showError) {
      toast.error(errorMessage);
    }
    
    console.error('Error fetching rate policies with pricing:', err);
    return [];
  }
}