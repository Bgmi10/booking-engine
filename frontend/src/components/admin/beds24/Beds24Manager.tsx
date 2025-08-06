import React, { useState, useEffect } from 'react';
import { 
  RiHotelLine, 
  RiRefreshLine, 
  RiCheckLine, 
  RiCloseLine,
  RiLinkM,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiDownloadLine,
  RiUploadLine,
  RiPulseLine,
  RiAlertLine,
  RiTimeLine,
  RiSettings3Line
} from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { format } from 'date-fns';
import { baseUrl } from '../../../utils/constants';
import RoomMappingModal from './RoomMappingModal';
import SyncSettingsModal from './SyncSettingsModal';
import BookingsModal from './BookingsModal';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalBookingsLast30Days: number;
  connectionStatus: boolean;
  lastSyncTime: string | null;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
}

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

export default function Beds24Manager() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [beds24Rooms, setBeds24Rooms] = useState<Beds24Room[]>([]);
  const [roomMappings, setRoomMappings] = useState<RoomMapping[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Modal states
  const [showRoomMappingModal, setShowRoomMappingModal] = useState(false);
  const [showSyncSettingsModal, setShowSyncSettingsModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  
  // Sync form state
  const [syncStartDate, setSyncStartDate] = useState('');
  const [syncEndDate, setSyncEndDate] = useState('');

  useEffect(() => {
    fetchDashboardStats();
    fetchRoomMappings();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/dashboard-stats`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
        setConnectionStatus(data.data.connectionStatus);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomMappings = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/room-mappings`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoomMappings(data.data || []);
        console.log('Room mappings loaded:', data.data);
      }
    } catch (error) {
      console.error('Failed to fetch room mappings:', error);
    }
  };

  const fetchBeds24Rooms = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/rooms`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setBeds24Rooms(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch Beds24 rooms:', error);
      toast.error('Failed to fetch Beds24 rooms');
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/test-connection`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.data?.connected) {
        setConnectionStatus(true);
        toast.success('Beds24 connection successful!');
        // Fetch rooms after successful connection
        await fetchBeds24Rooms();
      } else {
        setConnectionStatus(false);
        toast.error('Beds24 connection failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus(false);
      toast.error('Failed to test connection');
    } finally {
      setTestingConnection(false);
    }
  };

  const syncRatesAndAvailability = async () => {
    if (!syncStartDate || !syncEndDate) {
      toast.error('Please select date range for sync');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/sync-rates-availability`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: new Date(syncStartDate).toISOString(),
          endDate: new Date(syncEndDate).toISOString(),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        await fetchDashboardStats(); // Refresh stats
      } else {
        toast.error(data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync rates and availability');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Beds24 Channel Manager</h1>
        <p className="text-gray-600">
          Manage your OTA distribution through Beds24 integration
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${
              connectionStatus ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <RiPulseLine className={`w-6 h-6 ${
                connectionStatus ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
              <p className={`text-sm ${
                connectionStatus ? 'text-green-600' : 'text-red-600'
              }`}>
                {connectionStatus ? 'Connected to Beds24' : 'Not connected'}
              </p>
            </div>
          </div>
          
          <button
            onClick={testConnection}
            disabled={testingConnection}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingConnection ? (
              <BiLoader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RiRefreshLine className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </button>
        </div>

        {connectionStatus && stats && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Property ID</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">288531</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Sync</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {stats.lastSyncTime ? format(new Date(stats.lastSyncTime), 'MMM dd, HH:mm') : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Mapped Rooms</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {roomMappings.filter(m => m.isActive).length}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Auto Sync</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {roomMappings.some(m => m.autoSync) ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Bookings (30 days)</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {stats.totalBookingsLast30Days}
                </p>
              </div>
              <RiCalendarLine className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Bookings</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {stats.pendingBookings}
                </p>
              </div>
              <RiTimeLine className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Confirmed Bookings</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {stats.confirmedBookings}
                </p>
              </div>
              <RiCheckLine className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Revenue (30 days)</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  €{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <RiMoneyDollarCircleLine className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Room Mapping Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Mapping</h3>
          <p className="text-sm text-gray-600 mb-4">
            Map your local rooms to Beds24 rooms for rate and availability sync
          </p>
          
          {roomMappings.length > 0 ? (
            <div className="space-y-2 mb-4">
              {roomMappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <RiHotelLine className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {mapping.room?.name || 'Unknown Room'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Beds24: {mapping.beds24RoomName || mapping.beds24RoomId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
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
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-md mb-4">
              <RiLinkM className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No rooms mapped yet</p>
            </div>
          )}
          
          <button
            onClick={() => setShowRoomMappingModal(true)}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RiLinkM className="w-4 h-4 mr-2" />
            Manage Room Mappings
          </button>
        </div>

        {/* Rate & Availability Sync */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate & Availability Sync</h3>
          <p className="text-sm text-gray-600 mb-4">
            Push your rates and availability to Beds24
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={syncStartDate}
                onChange={(e) => setSyncStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={syncEndDate}
                onChange={(e) => setSyncEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={syncRatesAndAvailability}
              disabled={syncing || !syncStartDate || !syncEndDate}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <BiLoader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RiUploadLine className="w-4 h-4 mr-2" />
              )}
              Sync Rates & Availability
            </button>
          </div>
        </div>
      </div>

      {/* Additional Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowBookingsModal(true)}
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RiDownloadLine className="w-6 h-6 text-blue-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">View Bookings</p>
                <p className="text-xs text-gray-500">Import bookings from Beds24</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </button>

        <button
          onClick={() => setShowSyncSettingsModal(true)}
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RiSettings3Line className="w-6 h-6 text-gray-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Sync Settings</p>
                <p className="text-xs text-gray-500">Configure automation</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <RiAlertLine className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Webhook URL</p>
              <p className="text-xs text-gray-500">Configure in Beds24 dashboard</p>
              <p className="text-xs font-mono bg-gray-100 p-1 rounded mt-1 break-all">
                {window.location.origin}/api/v1/admin/beds24/webhook/booking
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showRoomMappingModal && (
        <RoomMappingModal
          isOpen={showRoomMappingModal}
          onClose={() => setShowRoomMappingModal(false)}
          beds24Rooms={beds24Rooms}
          onMappingCreated={() => {
            fetchRoomMappings();
            setShowRoomMappingModal(false);
          }}
        />
      )}

      {showSyncSettingsModal && (
        <SyncSettingsModal
          isOpen={showSyncSettingsModal}
          onClose={() => setShowSyncSettingsModal(false)}
        />
      )}

      {showBookingsModal && (
        <BookingsModal
          isOpen={showBookingsModal}
          onClose={() => setShowBookingsModal(false)}
        />
      )}
    </div>
  );
}