import { useState, useEffect } from 'react';
import { RiCloseLine, RiSettings4Line, RiCalendarLine, RiBookOpenLine, RiCopyleftLine } from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';
import RoomMappingModal from './RoomMappingModal';

interface ChannelDetailsModalProps {
  channel: {
    id: string;
    name: string;
    type: 'BOOKING_COM' | 'EXPEDIA' | 'AIRBNB';
    isActive: boolean;
    webhookUrl?: string;
    apiEndpoint?: string;
    commissionPercentage?: number;
    markupPercentage?: number;
    paymentModel: 'PAY_AT_CHANNEL' | 'PAY_AT_PROPERTY';
    createdAt: string;
    _count?: {
      channelBookings: number;
      channelRooms: number;
    };
  };
  onClose: () => void;
  onUpdate: () => void;
}

export default function ChannelDetailsModal({ channel, onClose }: ChannelDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'rates' | 'bookings'>('overview');
  const [channelRooms, setChannelRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRoomMappingOpen, setIsRoomMappingOpen] = useState(false);

  const webhookUrl = `${window.location.origin}/api/v1/channels/webhooks/${channel.type.toLowerCase().replace('_', '-')}/${channel.id}`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  const fetchChannelRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/admin/channel-managers/${channel.id}/rooms`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch channel rooms');
      
      const data = await response.json();
      setChannelRooms(data.data || []);
    } catch (error) {
      console.error('Error fetching channel rooms:', error);
      toast.error('Failed to load channel rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rooms') {
      fetchChannelRooms();
    }
  }, [activeTab]);

  const getChannelTypeLabel = (type: string) => {
    switch (type) {
      case 'BOOKING_COM': return 'Booking.com';
      case 'EXPEDIA': return 'Expedia';
      case 'AIRBNB': return 'Airbnb';
      default: return type;
    }
  };

  const formatPercentage = (value?: number) => {
    if (!value) return '0%';
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{channel.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {getChannelTypeLabel(channel.type)} • {channel.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: RiSettings4Line },
              { id: 'rooms', label: 'Room Mapping', icon: RiSettings4Line },
              { id: 'rates', label: 'Rates & Availability', icon: RiCalendarLine },
              { id: 'bookings', label: 'Bookings', icon: RiBookOpenLine },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="inline mr-2" size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {channel._count?.channelRooms || 0}
                  </div>
                  <div className="text-sm text-blue-600">Mapped Rooms</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {channel._count?.channelBookings || 0}
                  </div>
                  <div className="text-sm text-green-600">Total Bookings</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatPercentage(channel.commissionPercentage)}
                  </div>
                  <div className="text-sm text-yellow-600">Commission Rate</div>
                </div>
              </div>

              {/* Configuration Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Model</label>
                    <p className="text-gray-900">
                      {channel.paymentModel === 'PAY_AT_CHANNEL' ? 'Channel Collects' : 'Property Collects'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Commission</label>
                    <p className="text-gray-900">{formatPercentage(channel.commissionPercentage)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Markup</label>
                    <p className="text-gray-900">{formatPercentage(channel.markupPercentage)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      channel.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {channel.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-4">Webhook Configuration</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Use this URL in your {getChannelTypeLabel(channel.type)} account to receive booking notifications:
                </p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 p-3 bg-white border border-blue-200 rounded text-sm text-blue-800 break-all">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={copyWebhookUrl}
                    className="p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Copy URL"
                  >
                    <RiCopyleftLine size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Room Mapping</h3>
                <button
                  onClick={() => setIsRoomMappingOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Room Mapping
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : channelRooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No room mappings configured yet.</p>
                  <button
                    onClick={() => setIsRoomMappingOpen(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create First Mapping
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {channelRooms.map((room: any) => (
                    <div key={room.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{room.room?.name}</h4>
                          <p className="text-sm text-gray-600">
                            Channel Room ID: {room.channelRoomId}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {room.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rates' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Rates & Availability Sync</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  Rate and availability sync functionality will be implemented in the next phase.
                  This will allow automatic synchronization of your room rates and availability to {getChannelTypeLabel(channel.type)}.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Channel Bookings</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  Booking management interface will be implemented in the next phase.
                  This will show all bookings received from {getChannelTypeLabel(channel.type)} and allow you to manage them.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Room Mapping Modal */}
      {isRoomMappingOpen && (
        <RoomMappingModal
          channelId={channel.id}
          channelName={channel.name}
          channelType={channel.type}
          onClose={() => setIsRoomMappingOpen(false)}
          onSuccess={() => {
            fetchChannelRooms();
            setIsRoomMappingOpen(false);
          }}
        />
      )}
    </div>
  );
}