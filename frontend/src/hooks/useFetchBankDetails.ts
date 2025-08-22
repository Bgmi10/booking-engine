import { useEffect, useState } from "react"
import { baseUrl } from "../utils/constants";
import type { BankDetails } from "../types/types";

export const useFetchBankDetails = () => {
    const [bankDetails, setBankDetails] = useState<null | BankDetails[]>(null);
    const [loader, setLoader] = useState<boolean>(true);

    const fetchBankDetails = async () => {
        try {
          const response = await fetch(`${baseUrl}/admin/bank-details/all`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
    
          if (response.ok) {
            const data = await response.json();
            setBankDetails(data.data);
          }
        } catch (error) {
          console.error('Failed to fetch bank details:', error);
        } finally {
          setLoader(false);
        }
    };

    useEffect(() => {  
        fetchBankDetails();
    }, []);

    return {
        bankDetails,
        loader,
        fetchBankDetails
    }
}