import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { baseUrl } from '../../utils/constants';
import Header from '../Header';
import toast from 'react-hot-toast';
import { validateEmail } from '../../utils/helper';

export const WeddingPortalPasswordReset: React.FC = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [stage, setStage] = useState<'email' | 'otp'>('email');
    const navigate = useNavigate();

    const initiatePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!email) {
            toast.error("Email is required");
            return;
        }

        if (!validateEmail(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${baseUrl}/customers/wedding-portal-initiate-password-reset`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('OTP sent to your email');
                setStage('otp');
            } else {
                // Handle specific error cases
                if (data.error === 'USER_NOT_FOUND') {
                    toast.error('No account found with this email address. Please check and try again.');
                } else {
                    toast.error(data.message || 'Failed to send OTP');
                }
            }
        } catch (err) {
            toast.error('An unexpected error occurred');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!otp) {
            toast.error("OTP is required");
            return;
        }

        if (!newPassword) {
            toast.error("New password is required");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${baseUrl}/customers/wedding-portal-reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Password reset successful');
                navigate('/wedding-portal/login');
            } else {
                // Handle specific error cases
                switch(data.error) {
                    case 'OTP_EXPIRED':
                        toast.error('OTP has expired. Please request a new code.');
                        setStage('email'); // Go back to email stage to request new OTP
                        break;
                    case 'INVALID_OTP':
                        toast.error('Invalid OTP. Please check and try again.');
                        break;
                    case 'CUSTOMER_NOT_FOUND':
                        toast.error('No account found with this email.');
                        navigate('/wedding-portal/login');
                        break;
                    default:
                        toast.error(data.message || 'Password reset failed');
                }
            }
        } catch (err) {
            toast.error('An unexpected error occurred');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Header />
            <div className="flex-grow flex items-center justify-center px-6 py-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            {stage === 'email' ? 'Reset Password' : 'Verify OTP'}
                        </h1>
                        <p className="text-gray-600 mb-6">
                            {stage === 'email' 
                                ? 'Enter your email to receive a reset code' 
                                : 'Check your email for the OTP'}
                        </p>
                    </div>

                    <form 
                        onSubmit={stage === 'email' ? initiatePasswordReset : resetPassword} 
                        className="space-y-6"
                    >
                        <div className="space-y-4">
                            {stage === 'email' ? (
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                   focus:outline-none focus:ring-2 focus:ring-black 
                                                   transition-all duration-300 
                                                   bg-white text-gray-900"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                                            OTP
                                        </label>
                                        <input
                                            id="otp"
                                            type="text"
                                            required
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                       focus:outline-none focus:ring-2 focus:ring-black 
                                                       transition-all duration-300"
                                            placeholder="Enter OTP"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                                            New Password
                                        </label>
                                        <input
                                            id="new-password"
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                       focus:outline-none focus:ring-2 focus:ring-black 
                                                       transition-all duration-300"
                                            placeholder="Create a new password"
                                            minLength={8}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirm Password
                                        </label>
                                        <input
                                            id="confirm-password"
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                       focus:outline-none focus:ring-2 focus:ring-black 
                                                       transition-all duration-300"
                                            placeholder="Confirm your new password"
                                            minLength={8}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-black text-white py-4 rounded-lg 
                                           hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-700 
                                           transition-all duration-300 
                                           disabled:opacity-50 disabled:cursor-not-allowed 
                                           flex items-center justify-center space-x-2"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    stage === 'email' ? 'Send OTP' : 'Reset Password'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};