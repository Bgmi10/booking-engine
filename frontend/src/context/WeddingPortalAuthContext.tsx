import { createContext, useContext } from "react"
import { useAuth } from "../hooks/useAuth";
import type { User } from "../types/types";

export const WeddingPortalAuthContext = createContext({
    isAuthenticated: false,
    user: null as User | null,
    isLoading: false,
    //@ts-ignore
    setUser: (user: User | null) => {},     
    logout: () => Promise.resolve()
})

export const WeddingPortalAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated, isLoading, logout, setUser } = useAuth<User>({
        redirectPath: "/wedding-portal/login",
        // Only fetch user if we're on a wedding portal route
        autoFetch: () => window.location.pathname.startsWith("/wedding-portal")
    });

    return (
        <WeddingPortalAuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            isLoading, 
            logout, 
            setUser 
        }}>
            {children}
        </WeddingPortalAuthContext.Provider>
    )
}

export const useWeddingPortalAuth = () => {
    return useContext(WeddingPortalAuthContext);
} 