import { useEffect, useState } from 'react';
import { baseUrl } from '../../../utils/constants';
import { RiCloseLine, RiAddLine, RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import RoomSelector from './RoomSelector';
import type { AutomatedTaskRule } from '../../../types/types';

const triggerTypes = [
  { value: 'DAY_OF_STAY', label: 'Day of Stay' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'CHECK_IN', label: 'Check-In' },
  { value: 'CHECK_OUT', label: 'Check-Out' },
];
const roleOptions = [
  'ADMIN', 'MANAGER', 'RECEPTION', 'CLEANER', 'MAINTENANCE', 'KITCHEN', 'WAITER'
];
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const roomScopeOptions = [
  { value: 'ALL_ROOMS', label: 'All Rooms' },
  { value: 'SPECIFIC_ROOMS', label: 'Specific Rooms' },
];

function RuleModal({ open, onClose, onSaved, initial }: {
  open: boolean,
  onClose: () => void,
  onSaved: () => void,
  initial?: Partial<AutomatedTaskRule>
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [taskTitle, setTaskTitle] = useState(initial?.taskTitle || '');
  const [taskDescription, setTaskDescription] = useState(initial?.taskDescription || '');
  const [triggerType, setTriggerType] = useState(initial?.triggerType || 'DAY_OF_STAY');
  const [triggerDay, setTriggerDay] = useState(initial?.triggerDay || '');
  const [triggerTime, setTriggerTime] = useState(initial?.triggerTime || '');
  const [assignedRole, setAssignedRole] = useState(initial?.assignedRole || 'CLEANER');
  const [roomScope, setRoomScope] = useState(initial?.roomScope || 'ALL_ROOMS');
  const [roomIds, setRoomIds] = useState<string[]>(initial?.roomIds || []);
  const [priority, setPriority] = useState(initial?.priority || 'MEDIUM');
  const [dueDateOffset, setDueDateOffset] = useState(initial?.dueDateOffset || '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (roomScope === 'SPECIFIC_ROOMS') {
      fetch(baseUrl + '/admin/rooms/all', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setRooms(data.data || []))
        .catch(() => setRooms([]));
    }
  }, [roomScope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name,
        description,
        taskTitle,
        taskDescription,
        triggerType,
        triggerDay: triggerDay ? Number(triggerDay) : undefined,
        triggerTime: triggerTime || undefined,
        assignedRole,
        roomScope,
        roomIds: roomScope === 'SPECIFIC_ROOMS' ? roomIds : [],
        priority,
        dueDateOffset: dueDateOffset ? Number(dueDateOffset) : undefined,
        isActive,
      };
      let res;
      if (initial?.id) {
        res = await fetch(baseUrl + `/admin/automated-task-rules/${initial.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(baseUrl + '/admin/automated-task-rules', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('Failed to save rule');
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-30 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative mt-60">
        <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>
          <RiCloseLine className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold mb-4">{initial?.id ? 'Edit' : 'New'} Automated Task Rule</h2>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Task Title</label>
          <input className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Task Description</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={2} />
        </div>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Trigger Type</label>
            <select className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" value={triggerType} onChange={e => setTriggerType(e.target.value)}>
              {triggerTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Trigger Day</label>
            <input type="number" className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" value={triggerDay} onChange={e => setTriggerDay(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Trigger Time</label>
            <input type="time" className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" value={triggerTime} onChange={e => setTriggerTime(e.target.value)} />
          </div>
        </div>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Assigned Role</label>
            <select className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" value={assignedRole} onChange={e => setAssignedRole(e.target.value)}>
              {roleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" value={priority} onChange={e => setPriority(e.target.value)}>
              {priorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Room Scope</label>
            <select className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" value={roomScope} onChange={e => setRoomScope(e.target.value)}>
              {roomScopeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {roomScope === 'SPECIFIC_ROOMS' && (
            <div className="flex-1">
              <RoomSelector
                rooms={rooms}
                value={roomIds}
                onChange={setRoomIds}
              />
            </div>
          )}
        </div>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Due Date Offset (hours)</label>
            <input type="number" className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" value={dueDateOffset} onChange={e => setDueDateOffset(e.target.value)} min={0} />
          </div>
          <div className="flex-1 flex items-center gap-2 mt-6">
            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor="isActive" className="text-sm font-medium">Active</label>
          </div>
        </div>
        {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
        <div className="flex gap-2 justify-end mt-4">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={loading}>{loading ? 'Saving...' : (initial?.id ? 'Save' : 'Create')}</button>
          <button type="button" className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={onClose} disabled={loading}>Cancel</button>
        </div>
      </form>
    </div>
  ) : null;
}

export default function AutomatedTaskRules({ onClose }: { onClose?: () => void }) {
  const [rules, setRules] = useState<AutomatedTaskRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<AutomatedTaskRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(baseUrl + '/admin/automated-task-rules', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch rules');
      const data = await res.json();
      setRules(data.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={onClose ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-30 overflow-y-auto" : "w-full"}>
      <div className={onClose ? "bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 relative mt-24" : "bg-white rounded-lg shadow-lg w-full p-6 relative"}>
        {onClose && (
          <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>
            <RiCloseLine className="w-6 h-6" />
          </button>
        )}
        <h2 className="text-xl font-semibold mb-4">Automated Task Rules</h2>
        <div className="mb-4 flex justify-between items-center">
          <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1" onClick={() => setShowCreate(true)}>
            <RiAddLine className="w-5 h-5" /> New Rule
          </button>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No automated task rules found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room Scope</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{rule.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{rule.triggerType}{rule.triggerDay !== undefined ? ` (Day ${rule.triggerDay})` : ''}{rule.triggerTime ? ` @ ${rule.triggerTime}` : ''}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{rule.assignedRole}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{rule.roomScope === 'ALL_ROOMS' ? 'All Rooms' : `Specific (${rule.roomIds.length})`}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button className="text-yellow-600 hover:text-yellow-900 p-1" title="Edit" onClick={() => setShowEdit(rule)}>
                          <RiEdit2Line className="w-5 h-5" />
                        </button>
                        <button className="text-red-600 hover:text-red-900 p-1" title="Delete" onClick={async () => {
                          if (window.confirm('Delete this rule?')) {
                            setLoading(true);
                            await fetch(baseUrl + `/admin/automated-task-rules/${rule.id}`, { method: 'DELETE', credentials: 'include' });
                            fetchRules();
                          }
                        }}>
                          <RiDeleteBin6Line className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <RuleModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={fetchRules} />
        <RuleModal open={!!showEdit} onClose={() => setShowEdit(null)} onSaved={fetchRules} initial={showEdit || undefined} />
      </div>
    </div>
  );
} 