import NotificationWidget from './notifications/NotificationWidget';
import { useAuth } from '../../context/AuthContext';

export default function AdminHeader({ onViewAllNotifications }: { onViewAllNotifications: () => void }) {
  const { user } = useAuth();
  return (
    <div className="bg-gray-50 mx-4 border-b border-gray-200">
      <div className="flex items-center justify-between gap-5 py-2 px-2">
        <div className="flex items-center gap-5">
          <img src="/assets/logo.png" alt="logo" className="w-18" />
          <span className="text-lg ">La Torre sulla via Francigena</span>
        </div>
        <div className="flex items-center gap-4">
          <NotificationWidget onViewAll={onViewAllNotifications} />
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded shadow-sm border border-gray-100">
            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            {/* Optionally add avatar/profile icon here */}
            { user?.role }
          </div>
        </div>
      </div>
    </div>
  );
} 