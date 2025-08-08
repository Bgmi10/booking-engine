import { useState, useEffect } from 'react';
import { RiCloseLine, RiLinkM, RiCheckLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';

interface LocalRoom {
  id: string;
  name: string;
  price: number;
  capacity: number;
  beds24Mapping?: {
    id: string;
    beds24RoomId: string;
    beds24RoomName: string;
    isActive: boolean;
  };
}

interface Beds24Room {
  roomId: string;
  roomName: string;
  roomDescription?: string;
  maxOccupancy: number;
  roomQty: number;
  isActive: boolean;
}

interface RoomMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  beds24Rooms: Beds24Room[];
  onMappingCreated: () => void;
}

export default function RoomMappingModal({
  isOpen,
  onClose,
  beds24Rooms,
  onMappingCreated
}: RoomMappingModalProps) {
  const [localRooms, setLocalRooms] = useState<LocalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocalRoom, setSelectedLocalRoom] = useState<string>('');
  const [selectedBeds24Room, setSelectedBeds24Room] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLocalRooms();
    }
  }, [isOpen]);

  const fetchLocalRooms = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/rooms/all`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocalRooms(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch local rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const createMapping = async () => {
    if (!selectedLocalRoom || !selectedBeds24Room) {
      toast.error('Please select both local and Beds24 rooms');
      return;
    }

    setCreating(true);
    try {
      // Find the selected Beds24 room to get its name
      const selectedBeds24RoomData = beds24Rooms.find(room => room.roomId === selectedBeds24Room);
      
      const response = await fetch(`${baseUrl}/admin/beds24/room-mappings`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          localRoomId: selectedLocalRoom,
          beds24RoomId: selectedBeds24Room,
          beds24RoomName: selectedBeds24RoomData?.roomName || 'Unknown Room',
          isActive: true,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Room mapping created successfully');
        onMappingCreated();
      } else {
        toast.error(data.message || 'Failed to create mapping');
      }
    } catch (error) {
      console.error('Failed to create mapping:', error);
      toast.error('Failed to create room mapping');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Room Mapping</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Create New Mapping Section */}
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-4">Create New Mapping</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local Room
                  </label>
                  <select
                    value={selectedLocalRoom}
                    onChange={(e) => setSelectedLocalRoom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a room...</option>
                    {localRooms
                      .filter(room => !room.beds24Mapping)
                      .map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} (€{room.price}/night)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beds24 Room
                  </label>
                  <select
                    value={selectedBeds24Room}
                    onChange={(e) => setSelectedBeds24Room(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a room...</option>
                    {beds24Rooms.map((room) => (
                      <option key={room.roomId} value={room.roomId}>
                        {room.roomName} (ID: {room.roomId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={createMapping}
                  disabled={creating || !selectedLocalRoom || !selectedBeds24Room}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <BiLoader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RiLinkM className="w-4 h-4 mr-2" />
                  )}
                  Create Mapping
                </button>
              </div>
            </div>

            {/* Existing Mappings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Existing Mappings</h4>
              
              {localRooms.filter(room => room.beds24Mapping).length > 0 ? (
                <div className="space-y-2">
                  {localRooms
                    .filter(room => room.beds24Mapping)
                    .map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-md"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <RiCheckLine className="w-5 h-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {room.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Mapped to: {room.beds24Mapping?.beds24RoomName} (ID: {room.beds24Mapping?.beds24RoomId})
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              room.beds24Mapping?.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {room.beds24Mapping?.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">No rooms mapped yet</p>
                </div>
              )}
            </div>

            {/* Note about Beds24 test room */}
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> You have a test room "Double Room" (ID: 602724) in Beds24. 
                Map this to one of your local rooms to test the integration.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}