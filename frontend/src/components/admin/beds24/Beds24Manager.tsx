import { useState, useEffect } from 'react';
import { BiLoader } from 'react-icons/bi';
import { 
  RiHotelLine, 
  RiCheckLine, 
  RiLinkM,
  RiCalendarLine,
  RiMoneyDollarCircleLine,  
  RiDownloadLine,
  RiUploadLine,
  RiPulseLine,
  RiTimeLine,
  RiSettings3Line,
  RiDashboardLine,
  RiSettingsLine,
  RiHistoryLine,
  RiPriceTag3Line
} from 'react-icons/ri';
import { format } from 'date-fns';
import { baseUrl } from '../../../utils/constants';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isValid } from 'date-fns';
import RoomMappingModal from './RoomMappingModal';
import SyncSettingsModal from './SyncSettingsModal';
import BookingsModal from './BookingsModal';
import SyncOnboardingModal from './SyncOnboardingModal';
import RatePolicyMappingModal from './RatePolicyMappingModal';
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

type Tab = 'dashboard' | 'rooms' | 'bookings' | 'settings' | 'history';

export default function Beds24Manager() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [beds24Rooms, setBeds24Rooms] = useState<Beds24Room[]>([]);
  const [roomMappings, setRoomMappings] = useState<RoomMapping[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<boolean>(true); // Connection is established
  const [syncing, setSyncing] = useState(false);
  
  // Modal states
  const [showRoomMappingModal, setShowRoomMappingModal] = useState(false);
  const [showSyncSettingsModal, setShowSyncSettingsModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showRatePolicyModal, setShowRatePolicyModal] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<RoomMapping | null>(null);
  const [showSyncOnboarding, setShowSyncOnboarding] = useState(false);
  
  // Sync form state
  const [syncStartDate, setSyncStartDate] = useState<Date>(new Date());
  const [syncEndDate, setSyncEndDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 30)));

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

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: RiDashboardLine },
    { id: 'rooms' as Tab, label: 'Room Mapping', icon: RiHotelLine },
    { id: 'bookings' as Tab, label: 'Bookings', icon: RiCalendarLine },
    { id: 'settings' as Tab, label: 'Settings', icon: RiSettingsLine },
    { id: 'history' as Tab, label: 'Sync History', icon: RiHistoryLine },
  ];

  const handleSyncRatesClick = () => {
    if (roomMappings.length === 0) {
      toast.error('Please create room mappings first');
      setActiveTab('rooms');
      return;
    }
    
    setShowSyncOnboarding(true);
  };

  const handleQuickSync = async () => {
    if (!syncStartDate || !syncEndDate) {
      toast.error('Please select date range for sync');
      return;
    }

    if (roomMappings.length === 0) {
      toast.error('Please create room mappings first');
      setActiveTab('rooms');
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
          startDate: syncStartDate.toISOString(),
          endDate: syncEndDate.toISOString(),
          applyToFutureDates: false
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Rates synced successfully!');
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'rooms':
        return renderRoomMapping();
      case 'bookings':
        return renderBookings();
      case 'settings':
        return renderSettings();
      case 'history':
        return renderHistory();
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
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
          
          <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-md">
            <RiCheckLine className="w-4 h-4 mr-2 text-green-600" />
            <span className="text-sm font-medium text-green-700">Connected</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-sm font-medium text-gray-500">Mapped Rooms</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {roomMappings.filter(m => m.isActive).length}
                </p>
              </div>
              <RiHotelLine className="w-8 h-8 text-purple-500" />
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

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Last Sync</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {stats.lastSyncTime ? format(new Date(stats.lastSyncTime), 'dd/MM/yyyy HH:mm') : 'Never'}
                </p>
              </div>
              <RiTimeLine className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <RiUploadLine className="w-6 h-6 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Sync Rates & Availability</p>
                <p className="text-xs text-gray-500">Push your rates to Beds24</p>
              </div>
            </div>
            <button
              onClick={handleSyncRatesClick}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Setup Guide →
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">Sync Period</label>
            <div className="flex flex-col space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 text-xs">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <DatePicker
                    selected={syncStartDate}
                    onChange={(date: Date | null) => {
                      if (date && isValid(date)) {
                        setSyncStartDate(date);
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select start date"
                    minDate={new Date()}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                  />
                </div>
                
                <span className="text-gray-500 mt-0 sm:mt-6 text-center">to</span>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <DatePicker
                    selected={syncEndDate}
                    onChange={(date: Date | null) => {
                      if (date && isValid(date)) {
                        setSyncEndDate(date);
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Select end date"
                    minDate={syncStartDate || new Date()}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleQuickSync}
            disabled={syncing || !syncStartDate || !syncEndDate}
            className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? 'Syncing...' : 'Quick Sync'}
          </button>
        </div>

        <button
          onClick={() => setActiveTab('rooms')}
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-purple-500"
        >
          <div className="flex items-center space-x-3">
            <RiLinkM className="w-6 h-6 text-purple-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Manage Room Mappings</p>
              <p className="text-xs text-gray-500">Configure room connections</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-green-500"
        >
          <div className="flex items-center space-x-3">
            <RiDownloadLine className="w-6 h-6 text-green-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">View Bookings</p>
              <p className="text-xs text-gray-500">Import from Beds24</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderRoomMapping = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Room Mappings</h3>
          <p className="text-sm text-gray-600">
            Connect your local rooms to Beds24 rooms for synchronization
          </p>
        </div>
        <button
          onClick={async () => {
            console.log('Fetching Beds24 rooms...');
            try {
              await fetchBeds24Rooms(); // Fetch rooms before opening modal
              console.log('Beds24 rooms fetched:', beds24Rooms);
              setShowRoomMappingModal(true);
            } catch (error) {
              console.error('Failed to fetch Beds24 rooms:', error);
              toast.error('Failed to load Beds24 rooms. Please try again.');
            }
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RiLinkM className="w-4 h-4 mr-2" />
          Add Room Mapping
        </button>
      </div>

      {roomMappings.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {roomMappings.map((mapping) => (
              <li key={mapping.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <RiHotelLine className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {mapping.room?.name || 'Unknown Room'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Beds24: {mapping.beds24RoomName || mapping.beds24RoomId}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedMapping(mapping);
                        setShowRatePolicyModal(true);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RiPriceTag3Line className="w-3 h-3 mr-1" />
                      Rate Policies
                    </button>
                    {mapping.syncStatus === 'SYNCED' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <RiCheckLine className="w-3 h-3 mr-1" />
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <RiTimeLine className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <RiLinkM className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No room mappings</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first room mapping.
          </p>
          <div className="mt-6">
            <button
              onClick={async () => {
                console.log('Fetching Beds24 rooms...');
                try {
                  await fetchBeds24Rooms(); // Fetch rooms before opening modal
                  console.log('Beds24 rooms fetched:', beds24Rooms);
                  setShowRoomMappingModal(true);
                } catch (error) {
                  console.error('Failed to fetch Beds24 rooms:', error);
                  toast.error('Failed to load Beds24 rooms. Please try again.');
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RiLinkM className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Room Mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Booking Management</h3>
          <p className="text-sm text-gray-600">
            View and manage bookings imported from Beds24
          </p>
        </div>
        <button
          onClick={() => setShowBookingsModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <RiDownloadLine className="w-4 h-4 mr-2" />
          Import Bookings
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">Booking management interface will be displayed here</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sync Settings</h3>
          <p className="text-sm text-gray-600">
            Configure how data is synchronized with Beds24
          </p>
        </div>
        <button
          onClick={() => setShowSyncSettingsModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <RiSettings3Line className="w-4 h-4 mr-2" />
          Configure Settings
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">Settings configuration interface will be displayed here</p>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Sync History</h3>
        <p className="text-sm text-gray-600">
          View the history of all synchronization activities
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">Sync history will be displayed here</p>
      </div>
    </div>
  );

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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`mr-2 h-5 w-5 ${
                  activeTab === tab.id 
                    ? 'text-blue-500' 
                    : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          renderTabContent()
        )}
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

      {showRatePolicyModal && selectedMapping && (
        <RatePolicyMappingModal
          isOpen={showRatePolicyModal}
          onClose={() => {
            setShowRatePolicyModal(false);
            setSelectedMapping(null);
          }}
          roomMapping={selectedMapping}
          onUpdate={fetchRoomMappings}
        />
      )}

      {showSyncOnboarding && (
        <SyncOnboardingModal
          isOpen={showSyncOnboarding}
          onClose={() => setShowSyncOnboarding(false)}
          onComplete={() => {
            setShowSyncOnboarding(false);
            toast.success('Rate sync configured successfully!');
          }}
        />
      )}
    </div>
  );
}