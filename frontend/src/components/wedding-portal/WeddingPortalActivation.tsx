import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { baseUrl } from '../../utils/constants';
import { useWeddingPortalAuth } from '../../context/WeddingPortalAuthContext';
import Header from '../Header';
import toast from 'react-hot-toast';
import { validateEmail } from '../../utils/helper';

type ValidationErrorDetail = {
    path: string;
    message: string;
}

export const WeddingPortalActivation: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useWeddingPortalAuth();

    // Try to extract email from URL query params
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const emailParam = searchParams.get('email');

        if (emailParam) setEmail(emailParam);
    }, [location.search]);


    const handleActivation = async (e: React.FormEvent) => {
        e.preventDefault();
    
        if (!email) {
            toast.error("Email is required")
            return;
        }

        if (!validateEmail(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long')
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${baseUrl}/customers/wedding-portal-activate-account`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    password, 
                    token: new URLSearchParams(location.search).get('token') || '' 
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setUser(data.user);
                toast.success('Account activated successfully');
                navigate('/wedding-portal/dashboard');
            } else {
                // Handle validation errors
                if (data.details && Array.isArray(data.details)) {
                    (data.details as ValidationErrorDetail[]).forEach(detail => {
                        toast.error(`${detail.path}: ${detail.message}`);
                    });
                } 
                // Handle other specific error messages
                else {
                    const errorMessage = data.error || data.message || 'Account activation failed';
                    
                    switch(true) {
                        case errorMessage.includes('Invalid activation token'):
                            toast.error("This activation link is no longer valid. Please request a new activation link.");
                            break;
                        case errorMessage.includes('account already activated'):
                            toast.error("This account has already been activated. Please log in.");
                            break;
                        case errorMessage.includes('Email not found'):
                            toast.error("No account found with this email address.");
                            break;
                        case errorMessage.includes('Token expired'):
                            toast.error("Activation link has expired. Please request a new activation link.");
                            break;
                        default:
                            toast.error(errorMessage)
                    }
                }
            }
        } catch (err) {
            toast.error('An unexpected error occurred. Please try again later.');
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
                            Welcome
                        </h1>
                        <p className="text-gray-600 mb-6">
                            Set up your wedding portal account
                        </p>
                    </div>

                    <form onSubmit={handleActivation} className="space-y-6">
                        <div className="space-y-4">
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
                                    readOnly={!!email}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                                               focus:outline-none focus:ring-2 focus:ring-black 
                                               transition-all duration-300 
                                               bg-white text-gray-900
                                               disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="Enter your email"
                                    disabled={!!email}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                                               focus:outline-none focus:ring-2 focus:ring-black 
                                               transition-all duration-300"
                                    placeholder="Create a password"
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
                                    placeholder="Confirm your password"
                                    minLength={8}
                                />
                            </div>
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
                                    'Activate Account'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}; 