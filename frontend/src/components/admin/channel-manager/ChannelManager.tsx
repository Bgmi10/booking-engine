import { useState, useEffect } from 'react';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';
import { 
  RiAddLine, 
  RiEditLine, 
  RiSettingsLine,
  RiShare2Line,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiEyeLine
} from 'react-icons/ri';
import CreateChannelModal from './CreateChannelModal';
import ChannelDetailsModal from './ChannelDetailsModal';

interface ChannelManager {
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
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<ChannelManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<ChannelManager | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch all channel managers
  const fetchChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/admin/channel-managers`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch channel managers');
      }

      const data = await response.json();
      setChannels(data.data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast.error('Failed to load channel managers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const getChannelTypeLabel = (type: string) => {
    switch (type) {
      case 'BOOKING_COM':
        return 'Booking.com';
      case 'EXPEDIA':
        return 'Expedia';
      case 'AIRBNB':
        return 'Airbnb';
      default:
        return type;
    }
  };

  const getChannelTypeColor = (type: string) => {
    switch (type) {
      case 'BOOKING_COM':
        return 'bg-blue-100 text-blue-800';
      case 'EXPEDIA':
        return 'bg-yellow-100 text-yellow-800';
      case 'AIRBNB':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channel Manager</h1>
          <p className="text-gray-600 mt-1">
            Manage connections to Booking.com, Expedia, and Airbnb
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RiAddLine className="mr-2" size={18} />
          Add Channel
        </button>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getChannelTypeColor(channel.type)}`}>
                  {getChannelTypeLabel(channel.type)}
                </span>
                <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs ${channel.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {channel.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedChannel(channel)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  title="View Details"
                >
                  <RiEyeLine size={18} />
                </button>
                <button
                  className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                  title="Edit Channel"
                >
                  <RiEditLine size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">{channel.name}</h3>
              
              <div className="flex items-center text-sm text-gray-600">
                <RiShare2Line className="mr-2" size={16} />
                <span>Payment: {channel.paymentModel === 'PAY_AT_CHANNEL' ? 'Channel Collects' : 'Property Collects'}</span>
              </div>

              {channel.commissionPercentage && (
                <div className="flex items-center text-sm text-gray-600">
                  <RiMoneyDollarCircleLine className="mr-2" size={16} />
                  <span>Commission: {(channel.commissionPercentage * 100).toFixed(1)}%</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div>
                  <div className="text-sm text-gray-500">Rooms</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {channel._count?.channelRooms || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Bookings</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {channel._count?.channelBookings || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <button
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                title="Manage Rooms"
              >
                <RiSettingsLine className="mr-1" size={16} />
                Manage Rooms
              </button>
              <button
                className="inline-flex items-center text-sm text-green-600 hover:text-green-700"
                title="View Rates"
              >
                <RiCalendarLine className="mr-1" size={16} />
                Rates
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {channels.length === 0 && (
        <div className="text-center py-12">
          <RiShare2Line className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Channel Managers</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first channel manager connection.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RiAddLine className="mr-2" size={18} />
              Add Channel
            </button>
          </div>
        </div>
      )}

      {/* Quick Setup Guide */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Getting Started with Booking.com</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>🔗 <strong>Step 1:</strong> Create a channel manager connection for Booking.com</p>
          <p>🏨 <strong>Step 2:</strong> Map your rooms to Booking.com room types</p>
          <p>💰 <strong>Step 3:</strong> Set up rates and availability sync</p>
          <p>📧 <strong>Step 4:</strong> Configure webhook endpoints for receiving bookings</p>
        </div>
        <div className="mt-4 p-3 bg-white rounded border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Webhook URL:</strong> <code className="bg-blue-100 px-2 py-1 rounded">{window.location.origin}/api/v1/channels/webhooks/booking-com/[CHANNEL_ID]</code>
          </p>
        </div>
      </div>

      {/* Modals */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchChannels}
      />

      {selectedChannel && (
        <ChannelDetailsModal
          channel={selectedChannel}
          onClose={() => setSelectedChannel(null)}
          onUpdate={fetchChannels}
        />
      )}
    </div>
  );
}