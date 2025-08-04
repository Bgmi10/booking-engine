import { useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ChannelFormData {
  name: string;
  type: 'BOOKING_COM' | 'EXPEDIA' | 'AIRBNB';
  paymentModel: 'PAY_AT_CHANNEL' | 'PAY_AT_PROPERTY';
  commissionPercentage: number;
  markupPercentage: number;
  apiEndpoint?: string;
  apiUsername?: string;
  apiPassword?: string;
  propertyId?: string;
  isActive: boolean;
}

export default function CreateChannelModal({ isOpen, onClose, onSuccess }: CreateChannelModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ChannelFormData>({
    name: '',
    type: 'BOOKING_COM',
    paymentModel: 'PAY_AT_CHANNEL',
    commissionPercentage: 15,
    markupPercentage: 0,
    apiEndpoint: '',
    apiUsername: '',
    apiPassword: '',
    propertyId: '',
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Channel name is required');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        ...formData,
        commissionPercentage: formData.commissionPercentage / 100, // Convert to decimal
        markupPercentage: formData.markupPercentage / 100, // Convert to decimal
      };

      const response = await fetch(`${baseUrl}/admin/channel-managers`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create channel manager');
      }
//@ts-ignore
      const data = await response.json();
      toast.success('Channel manager created successfully');
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        type: 'BOOKING_COM',
        paymentModel: 'PAY_AT_CHANNEL',
        commissionPercentage: 15,
        markupPercentage: 0,
        apiEndpoint: '',
        apiUsername: '',
        apiPassword: '',
        propertyId: '',
        isActive: true,
      });
    } catch (error: any) {
      console.error('Error creating channel:', error);
      toast.error(error.message || 'Failed to create channel manager');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ChannelFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getChannelDetails = () => {
    switch (formData.type) {
      case 'BOOKING_COM':
        return {
          name: 'Booking.com',
          defaultName: 'Booking.com Integration',
          apiEndpoint: 'https://secure-supply-xml.booking.com/api/',
          commissionRange: '10-20%',
          description: 'World\'s largest accommodation booking platform'
        };
      case 'EXPEDIA':
        return {
          name: 'Expedia',
          defaultName: 'Expedia Integration',
          apiEndpoint: 'https://api.expediapartnercentral.com/',
          commissionRange: '10-18%',
          description: 'Leading online travel booking platform'
        };
      case 'AIRBNB':
        return {
          name: 'Airbnb',
          defaultName: 'Airbnb Integration',
          apiEndpoint: 'https://api.airbnb.com/',
          commissionRange: '3-5%',
          description: 'Home-sharing and vacation rental platform'
        };
      default:
        return {
          name: 'Unknown',
          defaultName: '',
          apiEndpoint: '',
          commissionRange: '',
          description: ''
        };
    }
  };

  const channelDetails = getChannelDetails();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Channel Manager</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Channel Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Channel Platform
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['BOOKING_COM', 'EXPEDIA', 'AIRBNB'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    handleInputChange('type', type);
                    handleInputChange('name', getChannelDetails().defaultName);
                  }}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.type === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">
                    {type === 'BOOKING_COM' ? 'Booking.com' : 
                     type === 'EXPEDIA' ? 'Expedia' : 'Airbnb'}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">{channelDetails.description}</p>
          </div>

          {/* Channel Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., My Hotel - Booking.com"
              required
            />
          </div>

          {/* Payment Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Model
            </label>
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  value="PAY_AT_CHANNEL"
                  checked={formData.paymentModel === 'PAY_AT_CHANNEL'}
                  onChange={(e) => handleInputChange('paymentModel', e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Channel Collects Payment</div>
                  <div className="text-sm text-gray-600">
                    {channelDetails.name} handles payment processing and sends you the money minus commission
                  </div>
                </div>
              </label>
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  value="PAY_AT_PROPERTY"
                  checked={formData.paymentModel === 'PAY_AT_PROPERTY'}
                  onChange={(e) => handleInputChange('paymentModel', e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">Property Collects Payment</div>
                  <div className="text-sm text-gray-600">
                    Guests pay you directly at check-in, you pay commission to {channelDetails.name}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Commission and Markup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commission Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={formData.commissionPercentage}
                  onChange={(e) => handleInputChange('commissionPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Typical range: {channelDetails.commissionRange}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={formData.markupPercentage}
                  onChange={(e) => handleInputChange('markupPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Additional markup on your base rates
              </p>
            </div>
          </div>

          {/* API Configuration */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900">API Configuration</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property ID
              </label>
              <input
                type="text"
                value={formData.propertyId}
                onChange={(e) => handleInputChange('propertyId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your property ID from the channel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint
              </label>
              <input
                type="url"
                value={formData.apiEndpoint}
                onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={channelDetails.apiEndpoint}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Username
                </label>
                <input
                  type="text"
                  value={formData.apiUsername}
                  onChange={(e) => handleInputChange('apiUsername', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="API username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Password
                </label>
                <input
                  type="password"
                  value={formData.apiPassword}
                  onChange={(e) => handleInputChange('apiPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="API password"
                />
              </div>
            </div>
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
              Activate channel immediately
            </label>
          </div>

          {/* Webhook URL Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Webhook Configuration</h4>
            <p className="text-sm text-blue-700 mb-2">
              After creating this channel, use this webhook URL in your {channelDetails.name} account:
            </p>
            <code className="block p-2 bg-white border border-blue-200 rounded text-xs text-blue-800 break-all">
              {window.location.origin}/api/v1/channels/webhooks/{formData.type.toLowerCase().replace('_', '-')}/[CHANNEL_ID]
            </code>
          </div>

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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}