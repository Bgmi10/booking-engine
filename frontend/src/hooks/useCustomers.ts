import { useCallback, useEffect, useState } from "react";
import { baseUrl } from "../utils/constants";

export interface Customer {
  id: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  guestNationality?: string;
  guestMiddleName?: string;
  vipStatus?: boolean;
  totalNightStayed?: number;
  totalMoneySpent?: number;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(baseUrl + "/admin/customers/all", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (e: any) {
      setError("Failed to fetch customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, loading, error, refetch: fetchCustomers };
} 