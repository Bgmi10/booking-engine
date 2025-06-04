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
      fetchUser();
    }, [])
    
    const logout = async () => {
      try {
        const res = await fetch(baseUrl + "/admin/logout", {
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
