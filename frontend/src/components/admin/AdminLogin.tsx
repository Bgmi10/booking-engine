/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Loader from "../Loader";
import { baseUrl } from "../../utils/constants";
import Header from "../Header";
import { BiLoader } from "react-icons/bi";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuth();
  
  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("login"); // login, forgotPassword, otpVerification, resetPassword
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [newPassword, setNewPassword] = useState({
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      navigate("/admin/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  // Timer effect for OTP countdown
  useEffect(() => {
    let interval: any;
    if (activeView === "otpVerification" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setMessage({ type: "error", text: "OTP expired. Please request a new one." });
    }
    return () => clearInterval(interval);
  }, [activeView, timer]);

  // Handle form input changes
  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  // Handle OTP input
  const handleOtpChange = (e: any, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = e.target.value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (e.target.value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle new password input
  const handlePasswordChange = (e: any) => {
    setNewPassword({
      ...newPassword,
      [e.target.name]: e.target.value,
    });
  };

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle login submission
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        body: JSON.stringify(formData),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.status === 200) {
        window.location.href = "/admin/dashboard";
      } else {
        const data = await response.json();
        setError(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      setError("An error occurred. Please try again later.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password request
  const handleForgotPassword = async (e: any) => {
    e.preventDefault();
    
    if (!formData.email) {
      setError("Please enter your email address");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${baseUrl}/admin/forget-password`, {
        method: "POST",
        body: JSON.stringify({ email: formData.email }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (response.status === 200) {
        setActiveView("otpVerification");
        setTimer(300); // Reset timer to 5 minutes
        setMessage({ type: "success", text: "OTP sent to your email" });
      } else {
        setError(data.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      setError("An error occurred. Please try again later.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification and password reset
  const handleResetPassword = async (e: any) => {
    e.preventDefault();
    
    if (newPassword.password !== newPassword.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (newPassword.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`${baseUrl}/admin/reset-password`, {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          otp: otp.join(""),
          password: newPassword.password,
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (response.status === 200) {
        setMessage({ type: "success", text: "Password reset successful! You can now login with your new password." });
        setTimeout(() => {
          setActiveView("login");
        }, 3000);
      } else {
        setError(data.message || "Failed to reset password. Please try again.");
      }
    } catch (error) {
      setError("An error occurred. Please try again later.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div>
    <Header />
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-50" 
        style={{ backgroundImage: "url('/assets/admin-bg.png?height=800&width=1200')" }} />
      
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg relative z-10">
        {/* Login View */}
        {activeView === "login" && (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to access your admin dashboard
              </p>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {message.type === "success" && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="text-green-700">{message.text}</p>
              </div>
            )}
            
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="rounded-md space-y-6">
                <div>
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
                  onClick={() => {
                    setActiveView("forgotPassword");
                    setError("");
                    setMessage({ type: "", text: "" });
                  }}
                >
                  Forgot your password?
                </button>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <BiLoader className="animate-spin" />
                      <span className="ml-2">Signing in...</span>
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Forgot Password View */}
        {activeView === "forgotPassword" && (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter your email to receive a password reset code
              </p>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm font-medium text-gray-600 hover:text-gray-500 cursor-pointer"
                  onClick={() => {
                    setActiveView("login");
                    setError("");
                  }}
                >
                  Back to login
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center">
                       <BiLoader className="animate-spin" />
                      <span className="ml-2">Sending...</span>
                    </span>
                  ) : (
                    "Send Reset Code"
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* OTP Verification View */}
        {activeView === "otpVerification" && (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Verify OTP</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter the 6-digit code sent to {formData.email}
              </p>
              <p className="mt-2 text-sm font-medium text-indigo-600">
                Time remaining: {formatTime(timer)}
              </p>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {message.type === "success" && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="text-green-700">{message.text}</p>
              </div>
            )}
            
            <div className="mt-8">
              <div className="flex justify-center space-x-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    className="w-12 h-12 text-center border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                    value={otp[index]}
                    onChange={(e) => handleOtpChange(e, index)}
                    onKeyDown={(e) => {
                      // Handle backspace to go to previous input
                      if (e.key === "Backspace" && !otp[index] && index > 0) {
                        const prevInput = document.getElementById(`otp-${index - 1}`);
                        if (prevInput) prevInput.focus();
                      }
                    }}
                  />
                ))}
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">Set New Password</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                      id="new-password"
                      name="password"
                      type="password"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={newPassword.password}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={newPassword.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm font-medium text-gray-600 hover:text-gray-500 cursor-pointer"
                  onClick={() => {
                    setActiveView("forgotPassword");
                    setError("");
                    setMessage({ type: "", text: "" });
                  }}
                >
                  Back
                </button>
                
                <button
                  onClick={handleResetPassword}
                  disabled={loading || timer === 0}
                  className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    timer === 0 ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center">
                       <BiLoader className="animate-spin" />
                      <span className="ml-2">Processing...</span>
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
              
              {timer === 0 && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    onClick={() => {
                      setActiveView("forgotPassword");
                      setError("");
                      setMessage({ type: "", text: "" });
                    }}
                  >
                    Request new OTP
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}