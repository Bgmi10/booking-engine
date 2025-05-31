import { XCircle, RefreshCw, Home, AlertTriangle } from "lucide-react";
import Header from "./Header";

export default function Failure() {
    const handleTryAgain = () => {
        window.location.href = '/';
    };

    const handleReturnHome = () => {
        window.location.href = '/';
    };

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-4 sm:px-6">
                <div className="max-w-2xl mx-auto">
                    {/* Failure Message */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        
                        <h1 className="text-2xl sm:text-3xl font-semibold text-red-600 mb-2">
                            Payment Failed
                        </h1>
                        
                        <p className="text-gray-600 mb-6 text-sm sm:text-base max-w-md mx-auto">
                            We couldn't process your payment. This might be due to insufficient funds, 
                            card restrictions, or a temporary issue with your payment method.
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={handleTryAgain}
                                className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            
                            <button
                                onClick={handleReturnHome}
                                className="flex items-center justify-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Return to Home
                            </button>
                        </div>
                    </div>

                    {/* Help Section */}
                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h3 className="font-medium text-amber-800 mb-2">Need Help?</h3>
                                <div className="text-sm text-amber-700 space-y-1">
                                    <p>• Check that your card details are correct</p>
                                    <p>• Ensure you have sufficient funds available</p>
                                    <p>• Try using a different payment method</p>
                                    <p>• Contact your bank if the issue persists</p>
                                </div>
                                <p className="text-sm text-amber-700 mt-3">
                                    If you continue to experience issues, please contact our support team.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}