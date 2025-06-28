import { useState, useEffect } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';
import { useAuth } from '../../../context/AuthContext';
import SearchSelectModal from '../../common/SearchSelectModal';

const typeOptions = [
  { value: 'TASK', label: 'General Task' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'CLEANING', label: 'Room Cleaning' },
  { value: 'GUEST_REQUEST', label: 'Guest Request' },
  { value: 'BIRTHDAY', label: 'Birthday' },
  { value: 'CHECK_IN', label: 'Check-In' },
  { value: 'CHECK_OUT', label: 'Check-Out' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'SERVICE', label: 'Service/Waiter' },
  { value: 'ADMIN', label: 'Administrative' },
];
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'RECEPTION', label: 'Reception' },
  { value: 'CLEANER', label: 'Cleaner' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'WAITER', label: 'Waiter' },
];

// Role-based allowed types and assignable roles
const roleTypeMap: Record<string, { types: typeof typeOptions, roles: typeof roleOptions }> = {
  ADMIN: { types: typeOptions, roles: roleOptions },
  MANAGER: { types: typeOptions, roles: roleOptions },
  RECEPTION: { types: typeOptions, roles: roleOptions },
  WAITER: {
    types: typeOptions.filter(t => ['SERVICE', 'KITCHEN', 'TASK'].includes(t.value)),
    roles: roleOptions.filter(r => ['WAITER', 'KITCHEN'].includes(r.value))
  },
  CLEANER: {
    types: typeOptions.filter(t => ['CLEANING', 'TASK'].includes(t.value)),
    roles: roleOptions.filter(r => ['CLEANER'].includes(r.value))
  },
  MAINTENANCE: {
    types: typeOptions.filter(t => ['MAINTENANCE', 'TASK'].includes(t.value)),
    roles: roleOptions.filter(r => ['MAINTENANCE'].includes(r.value))
  },
  KITCHEN: {
    types: typeOptions.filter(t => ['KITCHEN', 'TASK'].includes(t.value)),
    roles: roleOptions.filter(r => ['KITCHEN'].includes(r.value))
  },
};

function CreateNotificationModal({ onClose, onCreated }: {
  onClose: () => void,
  onCreated: () => void
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('TASK');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [users, setUsers] = useState<{ id: string, name: string, role: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guests, setGuests] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [guestId, setGuestId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);

  // console.log(user?.id);

  useEffect(() => {
    if (assignRole) {
      fetchUsersByRole(assignRole);
    } else {
      setUsers([]);
      setAssignTo('');
    }
    // Fetch guests
    fetch(baseUrl + '/admin/customers/all', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setGuests(data.data || []))
      .catch(() => setGuests([]));
    // Fetch rooms
    fetch(baseUrl + '/admin/rooms/all', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setRooms(data.data || []))
      .catch(() => setRooms([]));
    // Fetch bookings
    fetch(baseUrl + '/admin/bookings/all', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setBookings(data.data || []))
      .catch(() => setBookings([]));
  }, [assignRole]);

  const fetchUsersByRole = async (role: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(baseUrl + `/admin/notification-users?role=${role}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.data || []);
      setAssignTo('');
    } catch (e) {
      setUsers([]);
      setAssignTo('');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Determine if assignTo is required
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const assignToRequired = !isAdminOrManager && !!assignRole;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(baseUrl + '/admin/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          assignedTo: assignTo || undefined,
          assignedRole: assignRole,
          createdBy: user?.id,
          guestId,
          roomId,
          bookingId,
          attachments,
        })
      });
      if (!res.ok) throw new Error('Failed to create notification');
      setTitle('');
      setDescription('');
      setType('TASK');
      setPriority('MEDIUM');
      setDueDate('');
      setAssignRole('');
      setAssignTo('');
      setUsers([]);
      setGuestId('');
      setRoomId('');
      setBookingId('');
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  // Filter type and role options based on user role
  const allowedTypes = user?.role && roleTypeMap[user.role] ? roleTypeMap[user.role].types : typeOptions;
  const allowedRoles = user?.role && roleTypeMap[user.role] ? roleTypeMap[user.role].roles : roleOptions;

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setUploadingAttachment(true);
    setError("");
    try {
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          const res = await fetch(`${baseUrl}/admin/upload-url`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: file.name, fileType: file.type }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to get upload URL");
          const uploadUrl = data.data.uploadUrl;
          const finalUrl = data.data.fileUrl;
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name}`);
          const objectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
          return {
            fileName: file.name,
            fileUrl: finalUrl,
            fileType: file.type,
            fileSize: file.size,
            previewUrl: objectUrl
          };
        })
      );
      setAttachmentPreviews(prev => [...prev, ...uploadResults.map(r => r.previewUrl)]);
      setAttachments(prev => [...prev, ...uploadResults.map(({ previewUrl, ...rest }) => rest)]);
    } catch (error) {
      setError("Failed to upload one or more attachments. Please try again.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = async (index: number) => {
    const url = attachments[index]?.fileUrl;
    if (!url) return;
    const res = await fetch(`${baseUrl}/admin/delete-image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDragEnterAttachment = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(true);
  };

  const handleDragLeaveAttachment = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(false);
  };

  const handleDragOverAttachment = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropAttachment = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const event = {
        target: { files: e.dataTransfer.files }
      } as React.ChangeEvent<HTMLInputElement>;
      handleAttachmentUpload(event);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 bg-opacity-30 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative mt-80">
        <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>
          <RiCloseLine className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold mb-4">Create Notification/Task</h2>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {allowedTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {priorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="datetime-local"
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Assign Role</label>
            <select
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
              value={assignRole}
              onChange={e => setAssignRole(e.target.value)}
              required
            >
              <option value="">Select role...</option>
              {allowedRoles.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Assign To <span className="text-xs text-gray-500">{isAdminOrManager ? '(optional)' : '(required)'}</span></label>
            <select
              className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
              value={assignTo}
              onChange={e => setAssignTo(e.target.value)}
              required={assignToRequired}
              disabled={!assignRole || loadingUsers || users.length === 0}
            >
              <option value="">{loadingUsers ? 'Loading...' : isAdminOrManager ? 'Select user (optional)...' : 'Select user...'}</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            {isAdminOrManager && (
              <div className="text-xs text-gray-500 mt-1">Leave blank to assign to the entire group/role.</div>
            )}
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Guest</label>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 text-sm"
              onClick={() => setGuestModalOpen(true)}
            >
              {guestId
                ? (() => {
                    const g = guests.find(x => x.id === guestId);
                    return g ? `${g.guestFirstName} ${g.guestLastName} (${g.guestEmail})` : 'Select guest...';
                  })()
                : 'Select guest...'}
            </button>
            {guestId && (
              <button type="button" className="text-red-500 ml-1" onClick={() => setGuestId('')}>×</button>
            )}
          </div>
          <SearchSelectModal
            isOpen={guestModalOpen}
            onClose={() => setGuestModalOpen(false)}
            onSelect={g => setGuestId(g.id)}
            items={guests}
            columns={[
              { label: 'Name', render: g => `${g.guestFirstName} ${g.guestLastName}` },
              { label: 'Email', render: g => g.guestEmail },
              { label: 'Phone', render: g => g.guestPhone },
              { label: 'Nationality', render: g => g.guestNationality || '-' },
            ]}
            title="Select Guest"
            searchPlaceholder="Search by name, email, or phone..."
            getSearchString={g => `${g.guestFirstName} ${g.guestLastName} ${g.guestEmail} ${g.guestPhone}`}
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Room</label>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 text-sm"
              onClick={() => setRoomModalOpen(true)}
            >
              {roomId
                ? (() => {
                    const r = rooms.find(x => x.id === roomId);
                    return r ? `${r.name}` : 'Select room...';
                  })()
                : 'Select room...'}
            </button>
            {roomId && (
              <button type="button" className="text-red-500 ml-1" onClick={() => setRoomId('')}>×</button>
            )}
          </div>
          <SearchSelectModal
            isOpen={roomModalOpen}
            onClose={() => setRoomModalOpen(false)}
            onSelect={r => setRoomId(r.id)}
            items={rooms}
            columns={[
              { label: 'Name', render: r => r.name },
              { label: 'Description', render: r => r.description || '-' },
              { label: 'Capacity', render: r => r.capacity },
              { label: 'Price', render: r => r.price },
            ]}
            title="Select Room"
            searchPlaceholder="Search by name or description..."
            getSearchString={r => `${r.name} ${r.description}`}
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Booking</label>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 text-sm"
              onClick={() => setBookingModalOpen(true)}
            >
              {bookingId
                ? (() => {
                    const b = bookings.find(x => x.id === bookingId);
                    return b ? `${b.id} (${b.room?.name || 'Room'}: ${b.checkIn?.slice(0,10)} - ${b.checkOut?.slice(0,10)})` : 'Select booking...';
                  })()
                : 'Select booking...'}
            </button>
            {bookingId && (
              <button type="button" className="text-red-500 ml-1" onClick={() => setBookingId('')}>×</button>
            )}
          </div>
          <SearchSelectModal
            isOpen={bookingModalOpen}
            onClose={() => setBookingModalOpen(false)}
            onSelect={b => setBookingId(b.id)}
            items={bookings}
            columns={[
              { label: 'ID', render: b => b.id },
              { label: 'Room', render: b => b.room?.name || '-' },
              { label: 'Check In', render: b => b.checkIn?.slice(0,10) },
              { label: 'Check Out', render: b => b.checkOut?.slice(0,10) },
            ]}
            title="Select Booking"
            searchPlaceholder="Search by ID or room..."
            getSearchString={b => `${b.id} ${b.room?.name || ''}`}
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Attachments <span className="text-xs text-gray-500 ml-2">(Images, PDFs)</span></label>
          <div
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${isDraggingAttachment ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}
            onDragEnter={handleDragEnterAttachment}
            onDragLeave={handleDragLeaveAttachment}
            onDragOver={handleDragOverAttachment}
            onDrop={handleDropAttachment}
          >
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                <label htmlFor="attachment-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                  <span>Upload files</span>
                  <input
                    id="attachment-upload"
                    name="attachment-upload"
                    multiple
                    type="file"
                    className="sr-only"
                    accept="image/*,application/pdf"
                    onChange={handleAttachmentUpload}
                    disabled={loading || uploadingAttachment}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF, PDF up to 10MB</p>
              {uploadingAttachment && (
                <div className="flex items-center justify-center mt-2">
                  <span className="text-sm text-gray-500">Uploading...</span>
                </div>
              )}
              {isDraggingAttachment && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-md pointer-events-none">
                  <div className="bg-white p-4 rounded-md shadow-lg border border-indigo-300">
                    <p className="text-indigo-600 font-medium">Drop files to upload</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {attachments.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {attachments.map((att, index) => (
                <div key={index} className="relative group">
                  {att.fileType && att.fileType.startsWith('image/') && attachmentPreviews[index] ? (
                    <img src={attachmentPreviews[index]} alt={`Attachment ${index + 1}`} className="object-cover rounded-md w-full h-24" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-24 bg-gray-100 rounded-md">
                      <span className="text-xs text-gray-500">PDF</span>
                      <span className="text-xs text-gray-400 truncate w-20">{att.fileName}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={loading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateNotificationModal; 