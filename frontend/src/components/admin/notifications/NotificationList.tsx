import { useState, useEffect } from 'react';
import { RiCheckLine, RiEyeLine, RiDeleteBin6Line, RiRefreshLine, RiAddLine, RiEdit2Line } from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';
import { useAuth } from '../../../context/AuthContext';
import NotificationDetailsModal from './NotificationDetailsModal';
import CreateNotificationModal from './CreateNotificationModal';
import EditNotificationModal from './EditNotificationModal';
import type { Notification } from '../../../types/types';


const statusOptions = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'];
const priorityOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function NotificationList() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Notification | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState<'all' | 'createdByMe'>('all');

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, [statusFilter, priorityFilter]);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      let url = baseUrl + `/admin/notifications`;
      if (tab === 'createdByMe') {
        url += `?createdByMe=true`;
      } else {
        url += `?assignedTo=${user?.id}`;
      }
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (priorityFilter !== 'ALL') url += `&priority=${priorityFilter}`;
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
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(baseUrl + `/admin/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      // Optionally show error
    }
  };

  const deleteAttachment = async (att: any) => {
    // Remove from S3
    await fetch(baseUrl + '/admin/delete-image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ url: att.fileUrl }),
    });
    // Remove from backend
    await fetch(baseUrl + `/admin/notification-attachment/${att.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    fetchNotifications();
  };

  const filtered = notifications.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex gap-4 mb-4">
        <button
          className={`px-3 py-2 rounded ${tab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setTab('all')}
        >
          All
        </button>
        <button
          className={`px-3 py-2 rounded ${tab === 'createdByMe' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setTab('createdByMe')}
        >
          Created by You
        </button>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex gap-2 items-center">
          <button onClick={fetchNotifications} className="p-2 rounded bg-gray-100 hover:bg-gray-200" title="Refresh">
            <RiRefreshLine className="w-5 h-5" />
          </button>
          <button onClick={() => setShowCreate(true)} className="p-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1" title="Create Notification">
            <RiAddLine className="w-5 h-5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search notifications..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="px-2 py-2 border border-gray-300 rounded-md text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <select
            className="px-2 py-2 border border-gray-300 rounded-md text-sm"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            {priorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No notifications found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attachments</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map(n => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{n.title}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{n.type}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      n.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                      n.priority === 'URGENT' ? 'bg-red-600 text-white' :
                      n.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      n.priority === 'LOW' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{n.priority}</span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      n.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                      n.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                      n.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      n.status === 'CANCELLED' ? 'bg-gray-200 text-gray-500' :
                      n.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{n.status}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">{n.dueDate ? new Date(n.dueDate).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 text-sm">
                    <div className="flex gap-1 items-center">
                      {n.attachments && n.attachments.length > 0 && n.attachments.slice(0,2).map((att: any, idx: number) => (
                        <div key={idx} className="relative group">
                          {att.fileType && att.fileType.startsWith('image/') ? (
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img src={att.fileUrl} alt={att.fileName} className="object-cover rounded w-8 h-8 border" />
                            </a>
                          ) : (
                            <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                              <span className="text-lg">📄</span>
                            </a>
                          )}
                          {user?.role === 'ADMIN' && (
                            <button
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 text-xs opacity-0 group-hover:opacity-100"
                              title="Delete attachment"
                              onClick={e => { e.preventDefault(); deleteAttachment(att); }}
                            >×</button>
                          )}
                        </div>
                      ))}
                      {n.attachments && n.attachments.length > 2 && (
                        <span className="ml-1 text-xs text-gray-500">+{n.attachments.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Details"
                        onClick={() => { setSelected(n); setShowDetails(true); }}
                      >
                        <RiEyeLine className="w-5 h-5" />
                      </button>
                      <button
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Mark as Complete"
                        onClick={() => markAsComplete(n.id)}
                        disabled={n.status === 'COMPLETED'}
                      >
                        <RiCheckLine className="w-5 h-5" />
                      </button>
                      {(user?.id === n.createdByUserId || user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <>
                          <button
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                            onClick={() => deleteNotification(n.id)}
                          >
                            <RiDeleteBin6Line className="w-5 h-5" />
                          </button>
                          <button
                            className="text-yellow-600 hover:text-yellow-900 p-1"
                            title="Edit"
                            onClick={() => { setSelected(n); setShowEdit(true); }}
                          >
                            <RiEdit2Line className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showDetails && selected && (
        <NotificationDetailsModal notification={selected} onClose={() => setShowDetails(false)} />
      )}
      {showCreate && (
        <CreateNotificationModal onClose={() => setShowCreate(false)} onCreated={fetchNotifications} />
      )}
      {showEdit && selected && (
        <EditNotificationModal notification={selected} onClose={() => setShowEdit(false)} onUpdated={fetchNotifications} />
      )}
    </div>
  );
} 