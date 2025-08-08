import { RiSettings3Line, RiTimeLine, RiCalendarLine, RiMoneyDollarCircleLine, RiUploadLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';
import { useState } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, isValid } from 'date-fns';

interface SyncConfiguration {
  autoSync: boolean;
  syncFrequency: string;
  markupPercent: number;
  minStay: number;
  maxStay: number;
  syncStartDate: Date;
  syncEndDate: Date;
  applyToFutureDates: boolean;
}

interface SyncConfigurationStepProps {
  configuration: SyncConfiguration;
  onConfigurationChange: (config: SyncConfiguration) => void;
  selectedMappings?: string[];
}

export default function SyncConfigurationStep({ 
  configuration, 
  onConfigurationChange,
  selectedMappings = []
}: SyncConfigurationStepProps) {
  const [syncing, setSyncing] = useState(false);
  
  // Set default dates if not set
  if (!configuration.syncStartDate) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    onConfigurationChange({
      ...configuration,
      syncStartDate: tomorrow,
      syncEndDate: nextMonth,
      applyToFutureDates: false
    });
  }

  const handleTestSync = async () => {
    if (!configuration.syncStartDate || !configuration.syncEndDate) {
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
          startDate: configuration.syncStartDate.toISOString(),
          endDate: configuration.syncEndDate.toISOString(),
          applyToFutureDates: configuration.applyToFutureDates,
          roomMappings: selectedMappings,
          markupPercent: configuration.markupPercent,
          minStay: configuration.minStay,
          maxStay: configuration.maxStay
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Rates synced successfully!');
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
  
  const updateConfiguration = (field: keyof SyncConfiguration, value: any) => {
    onConfigurationChange({
      ...configuration,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Sync Configuration
        </h3>
        <p className="text-gray-600">
          Configure how rates and availability are synced with Beds24
        </p>
      </div>

      {/* Date Selection Section */}
      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <RiCalendarLine className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">Date Range Selection</h4>
        </div>

        <div className="mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <DatePicker
                selected={configuration.syncStartDate}
                onChange={(date: Date | null) => {
                  if (date && isValid(date)) {
                    updateConfiguration('syncStartDate', date);
                  }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start date"
                minDate={new Date()}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
              />
            </div>
            
            <span className="text-gray-500 mt-0 sm:mt-6 text-center">to</span>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <DatePicker
                selected={configuration.syncEndDate}
                onChange={(date: Date | null) => {
                  if (date && isValid(date)) {
                    updateConfiguration('syncEndDate', date);
                  }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select end date"
                minDate={configuration.syncStartDate || new Date()}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Apply to Future Dates</span>
            <p className="text-xs text-gray-500 mt-1">
              Automatically apply these rates to upcoming dates beyond the end date
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={configuration.applyToFutureDates}
              onChange={(e) => updateConfiguration('applyToFutureDates', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <button
          onClick={handleTestSync}
          disabled={syncing || !configuration.syncStartDate || !configuration.syncEndDate}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {syncing ? (
            <BiLoader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RiUploadLine className="w-4 h-4 mr-2" />
          )}
          {syncing ? 'Syncing...' : 'Test Sync Now'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto Sync Settings */}
        <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RiTimeLine className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Auto Sync</h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Enable Auto Sync</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configuration.autoSync}
                  onChange={(e) => updateConfiguration('autoSync', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Frequency
              </label>
              <select
                value={configuration.syncFrequency}
                onChange={(e) => updateConfiguration('syncFrequency', e.target.value)}
                disabled={!configuration.autoSync}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Configuration */}
        <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <RiMoneyDollarCircleLine className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Pricing</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beds24 Markup (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={configuration.markupPercent}
                  onChange={(e) => updateConfiguration('markupPercent', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.0"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Additional markup applied to all rates for Beds24
              </p>
            </div>
          </div>
        </div>

        {/* Stay Requirements */}
        <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <RiCalendarLine className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Stay Requirements</h4>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Stay (nights)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={configuration.minStay}
                onChange={(e) => updateConfiguration('minStay', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Stay (nights)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={configuration.maxStay}
                onChange={(e) => updateConfiguration('maxStay', parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <RiSettings3Line className="w-5 h-5 text-gray-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Advanced</h4>
          </div>

          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Webhook Notifications</span>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Error Reporting</span>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Rate Limiting</span>
                <span className="text-blue-600 font-medium">Standard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200/50">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <span className="font-medium">Date Range:</span> {configuration.syncStartDate && isValid(configuration.syncStartDate) ? format(configuration.syncStartDate, 'dd/MM/yyyy') : ''} to {configuration.syncEndDate && isValid(configuration.syncEndDate) ? format(configuration.syncEndDate, 'dd/MM/yyyy') : ''}
          </div>
          <div>
            <span className="font-medium">Future Dates:</span> {configuration.applyToFutureDates ? 'Enabled' : 'Disabled'}
          </div>
          <div>
            <span className="font-medium">Auto Sync:</span> {configuration.autoSync ? 'Enabled' : 'Disabled'}
          </div>
          <div>
            <span className="font-medium">Frequency:</span> {configuration.syncFrequency}
          </div>
          <div>
            <span className="font-medium">Markup:</span> {configuration.markupPercent}%
          </div>
          <div>
            <span className="font-medium">Stay Range:</span> {configuration.minStay}-{configuration.maxStay} nights
          </div>
        </div>
      </div>
    </div>
  );
}