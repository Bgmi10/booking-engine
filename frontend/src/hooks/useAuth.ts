import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/constants';

export const useAuth = <T = any>(
  options: { 
    profileEndpoint?: string, 
    logoutEndpoint?: string, 
    redirectPath?: string,
    autoFetch?: boolean | (() => boolean)
  } = {}
) => {
  const {
    profileEndpoint = '/customers/profile',
    logoutEndpoint = '/customers/logout',
    redirectPath = '/customers/order-items',
    autoFetch = true
  } = options;

  const [user, setUser] = useState<T | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    // Determine if we should fetch based on the autoFetch option
    const shouldFetch = typeof autoFetch === 'function' 
      ? autoFetch() 
      : autoFetch;

    if (!shouldFetch) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${baseUrl}${profileEndpoint}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (res.status === 401) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setUser(data.data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error(e);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const res = await fetch(`${baseUrl}${logoutEndpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = redirectPath;
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { 
    user, 
    isAuthenticated, 
    isLoading, 
    refresh: fetchUser, 
    logout,
    setUser 
  };
};