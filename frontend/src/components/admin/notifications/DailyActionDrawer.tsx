import React, { useEffect, useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';

interface DailyActionDrawerProps {
  open: boolean;
  onClose: () => void;
  user: { id: string; role: string };
}

interface Section {
  title: string;
  items: any[];
  count: number;
}

interface Sections {
  [key: string]: Section;
}

const todayStr = () => new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const sectionOrder = [
  'notifications',
  'checkIns',
  'checkOuts',
  'cleaning',
  'payments',
];

const sectionIcons: Record<string, React.ReactNode> = {
  notifications: <span role="img" aria-label="Tasks">📝</span>,
  checkIns: <span role="img" aria-label="Check In">🟢</span>,
  checkOuts: <span role="img" aria-label="Check Out">🔴</span>,
  cleaning: <span role="img" aria-label="Cleaning">🧹</span>,
  payments: <span role="img" aria-label="Payments">💶</span>,
};

const DailyActionDrawer: React.FC<DailyActionDrawerProps> = ({ open, onClose, user }) => {
  const [sections, setSections] = useState<Sections>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    fetch(
      `${baseUrl}/admin/notifications/daily-action-list?role=${encodeURIComponent(user.role)}&userId=${encodeURIComponent(user.id)}`,
      { credentials: 'include' }
    )
      .then(res => res.json())
      .then(data => {
        setSections(data.data.sections || {});
        // Expand all sections with items by default
        const expandedInit: Record<string, boolean> = {};
        Object.keys(data.data.sections || {}).forEach(key => {
          expandedInit[key] = true;
        });
        setExpanded(expandedInit);
      })
      .catch(() => setError('Failed to fetch daily action list'))
      .finally(() => setLoading(false));
  }, [open, user.id, user.role]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-lg h-full bg-white shadow-xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Daily Action List <span className="text-base font-normal text-gray-500">({todayStr()})</span></h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><RiCloseLine className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : Object.keys(sections).length === 0 ? (
            <div className="text-center py-8 text-gray-400">No actions for today 🎉</div>
          ) : (
            sectionOrder.filter(key => sections[key]).map(key => {
              const section = sections[key];
              return (
                <div key={key} className="mb-4 border rounded-lg shadow-sm bg-gray-50">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none"
                    onClick={() => setExpanded(exp => ({ ...exp, [key]: !exp[key] }))}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      {sectionIcons[key] || null} {section.title}
                      <span className="ml-2 inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{section.count}</span>
                    </span>
                    <span className="ml-2 text-gray-400">{expanded[key] ? '▲' : '▼'}</span>
                  </button>
                  {expanded[key] && (
                    <div className="px-4 pb-3">
                      {section.items.length === 0 ? (
                        <div className="text-gray-400 py-4">No items</div>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {section.items.map((item, idx) => (
                            <li key={item.id || idx} className="py-2">
                              {/* Basic info for now, can be customized per section */}
                              {key === 'notifications' && (
                                <div>
                                  <div className="font-medium">{item.title}</div>
                                  <div className="text-xs text-gray-500">{item.type} • {item.priority} • Due: {item.dueDate ? new Date(item.dueDate).toLocaleString() : 'N/A'}</div>
                                </div>
                              )}
                              {key === 'checkIns' && (
                                <div>
                                  <div className="font-medium">{item.customer?.guestFirstName} {item.customer?.guestLastName}</div>
                                  <div className="text-xs text-gray-500">Room: {item.room?.name} • Check-in: {item.checkIn ? new Date(item.checkIn).toLocaleString() : ''}</div>
                                </div>
                              )}
                              {key === 'checkOuts' && (
                                <div>
                                  <div className="font-medium">{item.customer?.guestFirstName} {item.customer?.guestLastName}</div>
                                  <div className="text-xs text-gray-500">Room: {item.room?.name} • Check-out: {item.checkOut ? new Date(item.checkOut).toLocaleString() : ''}</div>
                                </div>
                              )}
                              {key === 'cleaning' && (
                                <div>
                                  <div className="font-medium">Room: {item.room?.name}</div>
                                  <div className="text-xs text-gray-500">Check-out: {item.checkOut ? new Date(item.checkOut).toLocaleString() : ''}</div>
                                </div>
                              )}
                              {key === 'payments' && (
                                <div>
                                  <div className="font-medium">{item.customer?.guestFirstName} {item.customer?.guestLastName}</div>
                                  <div className="text-xs text-gray-500">Amount: €{item.amount} • Status: {item.status}</div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.25s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
    </div>
  );
};

export default DailyActionDrawer; 