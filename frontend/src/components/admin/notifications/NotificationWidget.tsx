import { useState, useEffect, useRef } from 'react';
import { RiNotification3Line, RiCheckLine, RiEyeLine } from 'react-icons/ri';
import { useAuth } from '../../../context/AuthContext';
import { baseUrl } from '../../../utils/constants';
import type { Notification } from '../../../types/types';

export default function NotificationWidget({ onViewAll }: { onViewAll?: () => void }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      let url = baseUrl + `/admin/notifications`;
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        url += `?assignedTo=${user.id}&status=PENDING&limit=10`;
      } else {
        url += `?status=PENDING&limit=10`;
      }
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = async (id: string) => {
    try {
      await fetch(baseUrl + `/admin/notifications/${id}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBy: user?.id })
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      // Optionally show error
      console.log(e);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <RiNotification3Line className="w-6 h-6 text-gray-700" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fadeIn">
          <div className="p-4 border-b font-semibold text-gray-800 flex items-center justify-between">
            Notifications
            <button onClick={fetchNotifications} className="text-xs text-blue-600 hover:underline">Refresh</button>
          </div>
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No new notifications</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 p-3 hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{n.title}</div>
                    {n.description && <div className="text-xs text-gray-500 mt-0.5">{n.description}</div>}
                    <div className="text-xs text-gray-400 mt-1">{n.dueDate ? `Due: ${new Date(n.dueDate).toLocaleString()}` : `Created: ${new Date(n.createdAt).toLocaleString()}`}</div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      className="text-green-600 hover:bg-green-50 rounded p-1"
                      title="Mark as complete"
                      onClick={() => markAsComplete(n.id)}
                    >
                      <RiCheckLine className="w-5 h-5" />
                    </button>
                    {/* Placeholder for view details */}
                    <button
                      className="text-blue-600 hover:bg-blue-50 rounded p-1"
                      title="View details"
                      // onClick={() => ...}
                    >
                      <RiEyeLine className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="p-2 border-t text-center">
            <button
              className="text-blue-600 text-sm hover:underline"
              style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
              onClick={() => { if (onViewAll) { setOpen(false); onViewAll(); } }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.15s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
} 