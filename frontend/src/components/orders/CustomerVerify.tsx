import { useEffect, useState } from "react";
import { baseUrl } from "../../utils/constants";
import { useNavigate } from "react-router-dom";

export default function CustomerVerify() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState<string>("Verifying your email, please wait...");
  const redirectUrl = localStorage.getItem('redirectAfterVerify');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. Token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`${baseUrl}/customers/verify?token=${token}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage("Your email has been successfully verified!");
          
          if (redirectUrl) {
            localStorage.removeItem('redirectAfterVerify');
            window.location.href = redirectUrl;
          }
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. The link may have expired.");
        }
      } catch (e) {
        console.error(e);
        setStatus("error");
        setMessage("Network error. Please try again later.");
      }
    };

    verify();
  }, [navigate]);

  const manualRedirect = () => {
    if (redirectUrl) {
      localStorage.removeItem('redirectAfterVerify');
      window.location.href = redirectUrl;
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-indigo-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" strokeWidth="4" className="opacity-75" />
              </svg>
            </div>
            <p className="text-gray-700">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center mb-4">
              <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Successful!</h2>
            <p className="text-gray-700 mb-6">You can now return to your order.</p>
            <button
              onClick={manualRedirect}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go Back
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center mb-4">
              <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-700 mb-6">{message}</p>
            <button
              onClick={manualRedirect}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}