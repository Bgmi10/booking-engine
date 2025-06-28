/* eslint-disable react-refresh/only-export-components */
import { useState, createContext, useContext, useEffect } from "react"
import { baseUrl } from "../utils/constants";
import type { User } from "../types/types";

export const AuthContext = createContext({
    isAuthenticated: false,
    user: null as User | null,
    isLoading: false,
    //@ts-ignore
    setUser: (user: User | null) => {},     
    logout: () => Promise.resolve()
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUser = async () => {
      try{
        const response = await fetch(`${baseUrl}/admin/profile`, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await response.json();
        
        if (response.status === 200) {
            setUser(data.data);
            setIsAuthenticated(true);
        } else {
            setUser(null);
            setIsAuthenticated(false);
        }

       } catch (e) {
        console.log(e);
       } finally {
        setIsLoading(true);
       }
    }

    useEffect(() => {
        const pathname = window.location.pathname;

        // Only fetch admin profile on specific admin routes
        if (pathname === "/admin/dashboard" || pathname === "/admin/login") {
            fetchUser();
        } else {
            // Mark loading finished if we are not on an admin route that requires auth
            setIsLoading(true);
        }
    }, []);
    
    const logout = async () => {
      try {
        const res = await fetch(baseUrl + "/admin/logout", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        })   
        if (res.status === 200) {
            setUser(null);
            setIsAuthenticated(false);
            window.location.href = "/admin/login";
        }
      } catch (error) {
        console.log(error);
      }
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, isLoading, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(AuthContext);
}
