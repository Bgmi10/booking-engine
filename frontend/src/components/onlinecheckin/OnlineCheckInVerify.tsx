import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { baseUrl } from "../../utils/constants";
import Loader from "../Loader";
import { XCircle, RefreshCw, Home, AlertTriangle } from "lucide-react";
import Header from "../Header";

export const OnlineCheckInVerify = () => {
    const { token } = useParams();
    const [loader, setLoader] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchOnlineCheckInUser = async () => {
        try  {
            const res = await fetch(baseUrl + '/customers/online-checkin/verify-token', {
                method: "POST",
                headers: {
                    "Content-type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    token
                })
            });

            const data = await res.json();

            if (res.status === 200) {
                navigate('/online-checkin');
            } else {
                setError(data.message || "Invalid or expired token");
            }
        } catch (e) {
            console.log(e);
            setError("Failed to verify token. Please try again later.");
        } finally {
            setLoader(false);
        } 
    }

    const handleTryAgain = () => {
        setLoader(true);
        setError(null);
        fetchOnlineCheckInUser();
    };

    const handleReturnHome = () => {
        window.location.href = '/';
    };

    useEffect(() => {
       if (token) {
         fetchOnlineCheckInUser()
       } else {
         setError("No verification token provided");
         setLoader(false);
       }
    }, [token]);

    // Show loader for success case (user will be redirected automatically)
    if (loader) {
        return <Loader />;
    }

    // Show error UI following Failure.tsx pattern
    if (error) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-gray-50 py-2 sm:py-8 px-2 sm:px-6">
                    <div className="max-w-xl mx-auto">
                        {/* Error Message */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
                            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            
                            <h1 className="text-xl font-semibold text-red-600 mb-2">
                                Link expires or Invalid
                            </h1>
                        
                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2">
                                <button
                                    onClick={handleTryAgain}
                                    className="text-sm flex items-center justify-center gap-2 bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </button>
                                
                                <button
                                    onClick={handleReturnHome}
                                    className="text-sm flex items-center justify-center gap-2 bg-gray-800 text-white px-2 py-3 rounded-md hover:bg-gray-700 transition-colors"
                                >
                                    <Home className="w-4 h-4" />
                                    Return to Home
                                </button>
                            </div>
                        </div>

                        {/* Help Section */}
                        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="font-medium text-amber-800 mb-2">Need Help?</h3>
                                    <div className="text-sm text-amber-700 space-y-1">
                                        <p>• Check that you clicked the correct link from your email</p>
                                        <p>• Ensure the link hasn't expired (valid until day after check-in)</p>
                                        <p>• Try refreshing the page or clicking the email link again</p>
                                        <p>• Contact reception if you need a new check-in link </p>
                                    </div>
                                    <p className="text-sm text-amber-700 mt-3">
                                        If you continue to experience issues, please contact our support team or reception.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return null;
}