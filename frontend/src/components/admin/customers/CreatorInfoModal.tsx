import { X, User, Mail, Phone, Info } from "lucide-react";
import { useUserInfo } from "../../../hooks/useUserInfo";

interface CreatorInfoModalProps {
    userId: string;
    onClose: () => void;
    title?: string;
    context?: string;
}

export default function CreatorInfoModal({ 
    userId, 
    onClose, 
    title = "Creator Information",
}: CreatorInfoModalProps) {
    const { userInfo: user, loading, error } = useUserInfo(userId);

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {title}
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