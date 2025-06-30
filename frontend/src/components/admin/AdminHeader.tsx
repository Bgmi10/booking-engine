import NotificationWidget from './notifications/NotificationWidget';
import { useAuth } from '../../context/AuthContext';
import { BsPlusLg } from 'react-icons/bs';
import { Menu } from 'lucide-react';

interface AdminHeaderProps {
  onViewAllNotifications: () => void;
  onCreateOrder: () => void;
  onToggleSidebar: () => void;
}

export default function AdminHeader({ onViewAllNotifications, onCreateOrder, onToggleSidebar }: AdminHeaderProps) {
  const { user } = useAuth();
  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/80 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-4 h-16">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-gray-600 hover:text-gray-900"
            aria-label="Toggle sidebar"
          >
            <Menu size={24} />
          </button>
          
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="logo" className="h-14 w-auto" />
          </div>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onCreateOrder}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-all transform hover:scale-105"
          >
            <BsPlusLg className="h-5 w-5" />
            <span className="hidden sm:block">New Order</span>
          </button>
          
          <NotificationWidget onViewAll={onViewAllNotifications} />
          
          <div className="flex items-center gap-2">
             <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-800">{user?.name}</span>
              <span className="text-xs text-gray-500">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 