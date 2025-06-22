import { X, User, Mail, Phone, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { baseUrl } from "../../../utils/constants";

interface UserInfo {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
}

interface CreatorInfoModalProps {
    userId: string;
    onClose: () => void;
}

export default function CreatorInfoModal({ userId, onClose }: CreatorInfoModalProps) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!userId) {
                setError("No user ID provided.");
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${baseUrl}/admin/users/${userId}`, {
                    credentials: "include",
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.data);
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || "Failed to fetch user information.");
                }
            } catch (err) {
                setError("An error occurred while fetching user information.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, [userId]);

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Creator Information
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 min-h-[150px]">
                    {loading ? (
                         <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading user info...</span>
                        </div>
                    ) : error ? (
                        <p className="text-red-500 text-center">{error}</p>
                    ) : user ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Mail className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <User className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="text-sm text-gray-500">Name</p>
                                    <p className="font-medium text-gray-900">{user.name}</p>
                                </div>
                            </div>
                            {user.phone && (
                                <div className="flex items-center gap-4">
                                    <Phone className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <p className="font-medium text-gray-900">{user.phone}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <Info className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="text-sm text-gray-500">Role</p>
                                    <p className="font-medium text-gray-900 capitalize">{user.role}</p>
                                </div>
                            </div>
                        </div>
                    ) : <p className="text-center text-gray-500">User not found.</p>}
                </div>
            </div>
        </div>
    );
} 