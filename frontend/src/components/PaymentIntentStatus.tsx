import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { baseUrl } from "../utils/constants";
import { RiFileUnknowFill } from "react-icons/ri";
import Loader from "./Loader";

export default function PaymentIntentStatus () {
    const { id } = useParams();
    const [error, setError] = useState("");

    useEffect(() => {
      const fetchPaymentIntentStatus = async () => {
        try {
            const res = await fetch(baseUrl + `/payment-intent/${id}/check-status`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            
            if (res.status === 200) {
                // Backend confirmed the payment intent is valid, now redirect
                window.location.href = baseUrl + `/payment-intent/${id}/check-status`;
            }
            if (res.status === 400) {
                setError(data.message);
            }
        } catch (e: any) {
            console.log(e);
            setError("An error occurred while processing your request");
        }
      } 
      fetchPaymentIntentStatus();
    }, [id]);

    return (
        <div>
            {error && 
               <div className="flex justify-center h-screen items-center flex-col gap-4">
                 <span className="flex items-center"><RiFileUnknowFill className="size-6"/>{error}</span>
                 <span>Contact latorre for more Information</span>
               </div>
            }
            {!error && <Loader />}
        </div>
    )
}