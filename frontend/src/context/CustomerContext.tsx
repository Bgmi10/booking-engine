import { createContext, useContext, useEffect, useState } from "react";
import { baseUrl } from "../utils/constants";
import type { Customer } from "../hooks/useCustomers";

// Define the shape of a temporary customer based on our schema
export interface TemporaryCustomer {
  id: string;
  surname: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerContextProps {
  customer: Customer | TemporaryCustomer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const CustomerContext = createContext<CustomerContextProps>({
  customer: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true
  refresh: async () => {},
  logout: async () => {},
});

export const CustomerProvider = ({ children }: { children: React.ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | TemporaryCustomer | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Initially loading

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${baseUrl}/customers/profile`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (res.status === 401) { // Specifically check for unauthorized
        setCustomer(null);
        setIsAuthenticated(false);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setCustomer(data.data);
        setIsAuthenticated(true);
      } else {
        setCustomer(null);
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error(e);
      setCustomer(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const res = await fetch(`${baseUrl}/customers/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setCustomer(null);
        setIsAuthenticated(false);
        window.location.reload(); // Reload to clear all state
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, []);

  return (
    <CustomerContext.Provider value={{ customer, isAuthenticated, isLoading, refresh: fetchCustomer, logout }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => useContext(CustomerContext); 