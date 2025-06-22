import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { baseUrl } from "../utils/constants";
import Loader from "./Loader";
import { XCircle } from "lucide-react";

export function ChargeStatus() {
    const { id } = useParams<{ id: string }>();
    //@ts-ignore
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchChargeStatus = async () => {
            if (!id) {
                setError("No charge ID found in the URL.");
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(baseUrl + `/charges/${id}/check-status`, {
                    method: "GET",
                    redirect: 'manual' // This prevents automatic redirect following
                });

                if (response.type === 'opaqueredirect' || response.status === 302) {
                    // Handle redirect manually
                    const redirectUrl = response.headers.get('Location') || response.url;
                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                        return;
                    }
                }
                
                if (!response.ok) {
                    const data = await response.json();
                    setError(data.message || "This payment link is either expired or invalid.");
                } else {
                    // If response is OK but no redirect, try to get the payment URL from response
                    const data = await response.json();
                    if (data.paymentUrl) {
                        window.location.href = data.paymentUrl;
                        return;
                    }
                }
                             
            } catch (e) {
                console.error("Fetch error:", e);
                setError("An unexpected error occurred. Please check your connection and try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchChargeStatus();
    }, [id]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full">
                    <XCircle className="text-red-500 mx-auto h-16 w-16" />
                    <h1 className="text-2xl font-bold text-gray-800 mt-6">Link Error</h1>
                    <p className="text-gray-600 mt-2">{error}</p>
                    <span className="text-gray-600 mt-2">Contact latorre for more Information</span>
                </div>
            </div>
        );
    }
        
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
            <Loader />
            <h1 className="text-2xl font-semibold text-gray-700 mt-6">Please wait</h1>
            <p className="text-gray-500 mt-2">We are securely redirecting you to the payment page...</p>
        </div>
    );
}