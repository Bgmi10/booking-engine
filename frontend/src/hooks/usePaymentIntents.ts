import { useState, useEffect } from 'react';
import { type PaymentIntent } from '../types/types';
import { baseUrl } from '../utils/constants';
import toast from 'react-hot-toast';

export const usePaymentIntents = (type: 'active' | 'deleted' = 'active', autoFetch: boolean = true) => {
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntent[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentIntents = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = type === 'active' 
        ? `${baseUrl}/admin/payment-intent/all`
        : `${baseUrl}/admin/payment-intent/soft-delete/all`;

      const response = await fetch(endpoint, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      
      if (response.ok && data) {
        const parseData = data.data.map((item: PaymentIntent) => {
          return {
            ...item,
            bookingData: item.bookingData ? JSON.parse(item.bookingData as any) : [],
            customerData: item.customerData ? JSON.parse(item.customerData as any) : {},
          };
        });

        setPaymentIntents(parseData);
      } else {
        throw new Error(data.message || 'Failed to fetch payment intents');
      }
    } catch (error) {
      console.error("Failed to fetch payment intents:", error);
      setError(error instanceof Error ? error.message : 'Failed to fetch payment intents');
      toast.error(`Failed to load ${type === 'deleted' ? 'deleted ' : ''}payment intents`);
    } finally {
      setLoading(false);
    }
  };

  const softDeletePaymentIntent = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/${id}/soft-delete`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast.success("Payment intent moved to trash");
        await fetchPaymentIntents();
        return true;
      } else {
        throw new Error("Failed to delete payment intent");
      }
    } catch (error) {
      toast.error("Failed to delete payment intent");
      return false;
    }
  };

  const hardDeletePaymentIntent = async (id: string): Promise<boolean> => {
    if (!confirm("Are you sure you want to permanently delete this payment intent? This action cannot be undone.")) {
      return false;
    }

    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/${id}/hard-delete`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast.success("Payment intent permanently deleted");
        await fetchPaymentIntents();
        return true;
      } else {
        throw new Error("Failed to permanently delete payment intent");
      }
    } catch (error) {
      toast.error("Failed to permanently delete payment intent");
      return false;
    }
  };

  const restorePaymentIntent = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/${id}/restore`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        await fetchPaymentIntents();
        return true;
      } else {
        throw new Error("Failed to restore payment intent");
      }
    } catch (error) {
      toast.error("Failed to restore payment intent");
      return false;
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchPaymentIntents();
    }
  }, [type, autoFetch]);

  return {
    paymentIntents,
    loading,
    error,
    refetch: fetchPaymentIntents,
    softDelete: softDeletePaymentIntent,
    hardDelete: hardDeletePaymentIntent,
    restore: restorePaymentIntent,
  };
};