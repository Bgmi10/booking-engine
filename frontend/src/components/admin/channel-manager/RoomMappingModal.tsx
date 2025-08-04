import { useState, useEffect } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';

interface RoomMappingModalProps {
  channelId: string;
  channelName: string;
  channelType: 'BOOKING_COM' | 'EXPEDIA' | 'AIRBNB';
  onClose: () => void;
  onSuccess: () => void;
}

interface Room {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
}

interface RoomMappingForm {
  roomId: string;
  channelRoomId: string;
  channelRoomName: string;
  isActive: boolean;
}

export default function RoomMappingModal({ 
  channelId, 
  channelName, 
  channelType, 
  onClose, 
  onSuccess 
}: RoomMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState<RoomMappingForm>({
    roomId: '',
    channelRoomId: '',
    channelRoomName: '',
    isActive: true,
  });

  // Fetch available rooms for this channel
  const fetchAvailableRooms = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/channel-managers/${channelId}/rooms/available`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch available rooms');
      
      const data = await response.json();
      setAvailableRooms(data.data || []);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      toast.error('Failed to load available rooms');
    }
  };

  useEffect(() => {
    fetchAvailableRooms();
  }, [channelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.roomId || !formData.channelRoomId || !formData.channelRoomName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${baseUrl}/admin/channel-managers/${channelId}/rooms`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: formData.roomId,
          channelRoomId: formData.channelRoomId,
          channelRoomName: formData.channelRoomName,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create room mapping');
      }

      toast.success('Room mapping created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating room mapping:', error);
      toast.error(error.message || 'Failed to create room mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof RoomMappingForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getChannelGuidance = () => {
    switch (channelType) {
      case 'BOOKING_COM':
        return {
          title: 'Booking.com Room Mapping',
          guidance: [
            'Log into your Booking.com extranet',
            'Go to Property > Room inventory',
            'Find the Room Type ID for each room you want to map',
            'The Room Type ID is usually a number like "123456"',
          ],
          idLabel: 'Booking.com Room Type ID',
          nameLabel: 'Room Type Name (as shown in Booking.com)',
          placeholder: 'e.g., 123456',
          namePlaceholder: 'e.g., Deluxe Double Room'
        };
      case 'EXPEDIA':
        return {
          title: 'Expedia Room Mapping',
          guidance: [
            'Log into your Expedia Partner Central',
            'Go to Property > Room types',
            'Find the Room Type ID for each room',
            'The Room Type ID is your unique identifier',
          ],
          idLabel: 'Expedia Room Type ID',
          nameLabel: 'Room Type Name (as shown in Expedia)',
          placeholder: 'e.g., DELUXE_DOUBLE',
          namePlaceholder: 'e.g., Deluxe Double Room'
        };
      case 'AIRBNB':
        return {
          title: 'Airbnb Room Mapping',
          guidance: [
            'Each Airbnb listing has a unique listing ID',
            'You can find this in your Airbnb host dashboard',
            'Go to Listings > Your listing > Professional hosting tools',
            'The listing ID is shown in the URL or listing details',
          ],
          idLabel: 'Airbnb Listing ID',
          nameLabel: 'Listing Name (as shown in Airbnb)',
          placeholder: 'e.g., 12345678',
          namePlaceholder: 'e.g., Cozy Downtown Apartment'
        };
      default:
        return {
          title: 'Room Mapping',
          guidance: [],
          idLabel: 'Channel Room ID',
          nameLabel: 'Channel Room Name',
          placeholder: 'Enter room ID',
          namePlaceholder: 'Enter room name'
        };
    }
  };

  const guidance = getChannelGuidance();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{guidance.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Guidance Section */}
          {guidance.guidance.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How to find your Room IDs:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                {guidance.guidance.map((step, index) => (
                  <li key={index} className="flex">
                    <span className="mr-2">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Local Room Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Local Room <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.roomId}
              onChange={(e) => handleInputChange('roomId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Choose a room from your property</option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} - €{room.price}/night (Max {room.capacity} guests)
                </option>
              ))}
            </select>
            {availableRooms.length === 0 && (
              <p className="mt-1 text-sm text-gray-500">
                All rooms are already mapped to this channel
              </p>
            )}
          </div>

          {/* Channel Room ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {guidance.idLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.channelRoomId}
              onChange={(e) => handleInputChange('channelRoomId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={guidance.placeholder}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The unique identifier for this room type in {channelName}
            </p>
          </div>

          {/* Channel Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {guidance.nameLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.channelRoomName}
              onChange={(e) => handleInputChange('channelRoomName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={guidance.namePlaceholder}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              The display name for this room as shown in {channelName}
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Activate room mapping immediately
            </label>
          </div>

          {/* Preview Section */}
          {formData.roomId && formData.channelRoomId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Mapping Preview:</h4>
              <div className="text-sm text-gray-600">
                <p>
                  <strong>Local Room:</strong> {availableRooms.find(r => r.id === formData.roomId)?.name}
                </p>
                <p>
                  <strong>{channelName} Room:</strong> {formData.channelRoomName} (ID: {formData.channelRoomId})
                </p>
                <p>
                  <strong>Status:</strong> {formData.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || availableRooms.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Mapping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}