import { RiCloseLine, RiCheckLine, RiDeleteBin6Line } from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';
import { useAuth } from '../../../context/AuthContext';
import { useState } from 'react';

export default function NotificationDetailsModal({ notification, onClose }: {
  notification: any,
  onClose: () => void
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isAssignee = user?.id === notification.assignedTo;
  const [statusUpdating, setStatusUpdating] = useState(false);

  const markAsComplete = async () => {
    setLoading(true);
    setError('');
    try {
      await fetch(baseUrl + `/admin/notifications/${notification.id}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBy: user?.id })
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to mark as complete');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async () => {
    setLoading(true);
    setError('');
    try {
      await fetch(baseUrl + `/admin/notifications/${notification.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to delete notification');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true);
    setError('');
    try {
      const res = await fetch(baseUrl + `/admin/notifications/${notification.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.id === notification.createdByUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>
          <RiCloseLine className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold mb-2">{notification.title}</h2>
        <div className="mb-2 text-sm text-gray-600">{notification.type}</div>
        <div className="mb-4 text-gray-700 whitespace-pre-line">{notification.description}</div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            notification.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
            notification.priority === 'URGENT' ? 'bg-red-600 text-white' :
            notification.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
            notification.priority === 'LOW' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>{notification.priority}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            notification.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
            notification.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
            notification.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
            notification.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500' :
            notification.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>{notification.status}</span>
        </div>
        <div className="mb-2 text-xs text-gray-500">Due: {notification.dueDate ? new Date(notification.dueDate).toLocaleString() : '-'}</div>
        <div className="mb-4 text-xs text-gray-400">Created: {new Date(notification.createdAt).toLocaleString()}</div>
        {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
        <div className="flex gap-2 justify-end">
          {isAssignee && notification.status === 'PENDING' && (
            <button
              className="flex items-center gap-1 px-3 py-1 rounded bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
              onClick={() => updateStatus('IN_PROGRESS')}
              disabled={statusUpdating}
            >
              Start
            </button>
          )}
          {isAssignee && notification.status !== 'COMPLETED' && (
            <button
              className="flex items-center gap-1 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              onClick={() => updateStatus('COMPLETED')}
              disabled={statusUpdating}
            >
              <RiCheckLine className="w-4 h-4" /> Complete
            </button>
          )}
          {isAssignee && notification.status !== 'CANCELLED' && notification.status !== 'COMPLETED' && (
            <button
              className="flex items-center gap-1 px-3 py-1 rounded bg-gray-400 text-white hover:bg-gray-500 disabled:opacity-50"
              onClick={() => updateStatus('CANCELLED')}
              disabled={statusUpdating}
            >
              Cancel
            </button>
          )}
          {!isAssignee && (
            <button
              className="flex items-center gap-1 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              onClick={markAsComplete}
              disabled={loading || notification.status === 'COMPLETED'}
            >
              <RiCheckLine className="w-4 h-4" /> Complete
            </button>
          )}
          {canDelete && (
            <button
              className="flex items-center gap-1 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              onClick={deleteNotification}
              disabled={loading}
            >
              <RiDeleteBin6Line className="w-4 h-4" /> Delete
            </button>
          )}
          <button
            className="flex items-center gap-1 px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={onClose}
            disabled={loading || statusUpdating}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 