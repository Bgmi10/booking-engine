import { useState, useEffect } from 'react';
import { RiHotelLine, RiRefreshLine, RiCheckLine, RiTimeLine, RiAddLine, RiLinkM } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';

interface Beds24Room {
  roomId: string;
  roomName: string;
  roomDescription?: string;
  maxOccupancy: number;
  roomQty: number;
  isActive: boolean;
}

interface RoomMapping {
  id: string;
  localRoomId: string;
  beds24RoomId: string;
  beds24RoomName?: string;
  isActive: boolean;
  autoSync: boolean;
  lastSyncAt?: string;
  syncStatus: string;
  room?: {
    id: string;
    name: string;
    price: number;
  };
}

interface RoomMappingStepProps {
  beds24Rooms: Beds24Room[];
  roomMappings: RoomMapping[];
  selectedMappings: string[];
  onMappingsChange: (mappings: string[]) => void;
  onRefreshRooms: () => void;
  onCreateMapping?: () => void;
  onMappingCreated?: () => void;
}

export default function RoomMappingStep({ 
  beds24Rooms, 
  roomMappings, 
  selectedMappings, 
  onMappingsChange,
  onRefreshRooms,
  onCreateMapping,
  onMappingCreated
}: RoomMappingStepProps) {
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [localRooms, setLocalRooms] = useState<any[]>([]);
  const [selectedLocalRoom, setSelectedLocalRoom] = useState('');
  const [selectedBeds24Room, setSelectedBeds24Room] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchLocalRooms();
  }, []);

  const fetchLocalRooms = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/rooms/all`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setLocalRooms(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch local rooms:', error);
    }
  };

  const createMapping = async () => {
    if (!selectedLocalRoom || !selectedBeds24Room) {
      toast.error('Please select both local and Beds24 rooms');
      return;
    }

    setCreating(true);
    try {
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
        setShowCreateForm(false);
        setSelectedLocalRoom('');
        setSelectedBeds24Room('');
        // Refresh the room mappings
        if (onMappingCreated) {
          onMappingCreated();
        }
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

  const handleMappingToggle = (mappingId: string) => {
    const updatedMappings = selectedMappings.includes(mappingId)
      ? selectedMappings.filter(id => id !== mappingId)
      : [...selectedMappings, mappingId];
    
    onMappingsChange(updatedMappings);
  };

  const handleRefreshRooms = async () => {
    setLoading(true);
    await onRefreshRooms();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Room Mapping
        </h3>
        <p className="text-gray-600">
          Select which room mappings to sync with Beds24
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            {selectedMappings.length} of {roomMappings.length} mappings selected
          </p>
        </div>
        <button
          onClick={handleRefreshRooms}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <BiLoader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RiRefreshLine className="w-4 h-4 mr-2" />
          )}
          Refresh Rooms
        </button>
      </div>

      {roomMappings.length > 0 ? (
        <div className="space-y-3">
          {roomMappings.map((mapping) => (
            <div 
              key={mapping.id}
              className={`bg-white/50 rounded-xl p-4 border cursor-pointer transition-all ${
                selectedMappings.includes(mapping.id)
                  ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                  : 'border-gray-200/50 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
              onClick={() => handleMappingToggle(mapping.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedMappings.includes(mapping.id)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedMappings.includes(mapping.id) && (
                      <RiCheckLine className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <RiHotelLine className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {mapping.room?.name || 'Unknown Room'}
                      </p>
                      <p className="text-xs text-gray-500">
                        → Beds24: {mapping.beds24RoomName || mapping.beds24RoomId}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      €{mapping.room?.price || 0}/night
                    </p>
                  </div>
                  <div>
                    {mapping.syncStatus === 'SYNCED' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <RiCheckLine className="w-3 h-3 mr-1" />
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <RiTimeLine className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50/50 rounded-xl p-8 border border-gray-200/50 text-center">
            <RiHotelLine className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Room Mappings</h4>
            <p className="text-gray-600 mb-4">
              You need to create room mappings first to proceed with the setup.
            </p>
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RiAddLine className="w-4 h-4 mr-2" />
              Create Room Mapping
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white/50 rounded-xl p-6 border border-blue-200/50">
              <h4 className="text-md font-medium text-gray-900 mb-4">Create New Mapping</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local Room
                  </label>
                  <select
                    value={selectedLocalRoom}
                    onChange={(e) => setSelectedLocalRoom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a room...</option>
                    {localRooms.map((room) => (
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedLocalRoom('');
                    setSelectedBeds24Room('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createMapping}
                  disabled={creating || !selectedLocalRoom || !selectedBeds24Room}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          )}
        </div>
      )}

      {selectedMappings.length > 0 && (
        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200/50">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Selected Mappings</h4>
          <p className="text-sm text-blue-700">
            {selectedMappings.length} room mapping{selectedMappings.length !== 1 ? 's' : ''} will be configured for sync
          </p>
        </div>
      )}
    </div>
  );
}