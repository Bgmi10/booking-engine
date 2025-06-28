import { createContext, useContext, useEffect, useState } from "react";
import { baseUrl } from "../utils/constants";
import type { Customer } from "../hooks/useCustomers";

interface CustomerContextProps {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const CustomerContext = createContext<CustomerContextProps>({
  customer: null,
  isAuthenticated: false,
  isLoading: false,
  refresh: async () => {},
  logout: async () => {},
});

export const CustomerProvider = ({ children }: { children: React.ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${baseUrl}/customers/profile`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
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
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith("/customers/order-items")) {
      fetchCustomer();
    }
  }, []);

  return (
    <CustomerContext.Provider value={{ customer, isAuthenticated, isLoading, refresh: fetchCustomer, logout }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => useContext(CustomerContext); 