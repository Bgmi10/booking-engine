import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { baseUrl } from '../../utils/constants';
import { useWeddingPortalAuth } from '../../context/WeddingPortalAuthContext';
import Loader from '../Loader';
import Header from '../Header';
import toast from 'react-hot-toast';
import { validateEmail } from '../../utils/helper';

export const WeddingPortalLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { setUser, isAuthenticated, isLoading: authLoading } = useWeddingPortalAuth();

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate('/wedding-portal/dashboard');
        }
    }, [isAuthenticated, authLoading, navigate]);

    if (authLoading) {
        return <Loader />;
    }

    const handleLogin = async (e: React.FormEvent) => {
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

        if (!password) {
            toast.error("Password is required");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${baseUrl}/customers/wedding-portal-login`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setUser(data.user);
                toast.success('Login successful');
                window.location.href = '/wedding-portal/dashboard';
            } else {
                // Handle specific error cases
                switch(data.error) {
                    case 'INVALID_CREDENTIALS':
                        toast.error('Invalid email or password. Please try again.');
                        break;
                    case 'ACCOUNT_NOT_ACTIVATED':
                        toast.error('Account not activated. Please activate your account or check your credentials.');
                        navigate('/wedding-portal/activate-account');
                        break;
                    default:
                        toast.error(data.message || 'Login failed');
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
                            Welcome Back
                        </h1>
                        <p className="text-gray-600 mb-6">
                            Sign in to your wedding portal account
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
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
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                                               focus:outline-none focus:ring-2 focus:ring-black 
                                               transition-all duration-300 
                                               bg-white text-gray-900"
                                    placeholder="Enter your email"
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
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <Link 
                                    to="/wedding-portal/reset-password" 
                                    className="font-medium text-black hover:text-gray-700"
                                >
                                    Forgot password?
                                </Link>
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
                                    'Sign In'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};