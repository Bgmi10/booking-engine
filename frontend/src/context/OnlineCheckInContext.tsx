import React, { createContext, useContext, useEffect, useState } from "react";
import { baseUrl } from "../utils/constants";

interface OnlineCheckInContextType {
    customer: any;
    loader: boolean;
    refetchCustomer: () => void;
    primaryBookingId: string | null;
}

export const OnlineCheckInContext = createContext<OnlineCheckInContextType>({
    customer: null,
    loader: true,
    refetchCustomer: () => {},
    primaryBookingId: null
})

export const OnlineCheckInProvider = ({ children }: { children: React.ReactNode }) => {
    const [customer, setCustomer] = useState<null>(null);
    const [loader, setLoader] = useState(true);
    const [primaryBookingId, setPrimaryBookingId] = useState<string | null>(null);

    const fetchOnlineCheckInCustomer = async (): Promise<boolean> => {        
        try {
            const res = await fetch(baseUrl + "/customers/online-checkin/guest-details", {
                method: "GET",
                credentials: "include", 
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (res.status === 200) {
                const data = await res.json();
                setCustomer(data.data);
                setPrimaryBookingId(data.data?.primaryBookingId || null);
                return true;
            } else {
                setCustomer(null);
                setPrimaryBookingId(null);
                return false;
            }
        } catch (e) {
            console.log(e);
            setCustomer(null);
            setPrimaryBookingId(null);
            return false;
        } finally {
           setLoader(false)
        }
    }   

    useEffect(() => {
        const pathname = window.location.pathname;
        
        // Check if we're on any online-checkin route
        if (pathname.startsWith("/online-checkin")) {
          // Fetch with automatic retry logic
          fetchOnlineCheckInCustomer();
        } else {
            setLoader(false);
        }
    }, [])
   
    return (
       <OnlineCheckInContext.Provider value={{ customer, loader, refetchCustomer: () => fetchOnlineCheckInCustomer(), primaryBookingId }}>
        {children}
       </OnlineCheckInContext.Provider>
    )
}

export const useOnlineCheckIn = () => {
    return useContext(OnlineCheckInContext);
}