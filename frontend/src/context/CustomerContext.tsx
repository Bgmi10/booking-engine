import { createContext, useContext } from "react";
import { useAuth } from "../hooks/useAuth";
import type { CustomerData } from "../types/types";

interface CustomerContextProps {
  customer: CustomerData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const CustomerContext = createContext<CustomerContextProps>({
  customer: null,
  isAuthenticated: false,
  isLoading: true,
  refresh: async () => {},
  logout: async () => {},
});

export const CustomerProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading, refresh, logout } = useAuth<CustomerData>({
    // Only fetch user if we're on a route that requires customer authentication
    autoFetch: () => {
      const pathname = window.location.pathname;
      return pathname.startsWith("/customers");
    }
  });

  return (
    <CustomerContext.Provider 
      value={{ 
        customer: user, 
        isAuthenticated, 
        isLoading, 
        refresh, 
        logout 
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => useContext(CustomerContext); 