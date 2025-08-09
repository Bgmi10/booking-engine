import { useState } from 'react';
import { RiCloseLine, RiSave3Line, RiInformationLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { toast } from 'react-hot-toast';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SyncSettingsModal({ isOpen, onClose }: SyncSettingsModalProps) {
  const [settings, setSettings] = useState({
    autoSync: false,
    syncFrequency: 3600, // seconds
    defaultMinStay: 1,
    defaultMaxStay: 30,
    markupPercentage: 0,
    syncRates: true,
    syncAvailability: true,
    syncRestrictions: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would save to your backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Sync settings saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sync Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Automatic Sync
              </label>
              <p className="text-sm text-gray-500">
                Automatically sync rates and availability at regular intervals
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, autoSync: !settings.autoSync })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.autoSync ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoSync ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sync Frequency */}
          {settings.autoSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Frequency
              </label>
              <select
                value={settings.syncFrequency}
                onChange={(e) => setSettings({ ...settings, syncFrequency: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1800}>Every 30 minutes</option>
                <option value={3600}>Every hour</option>
                <option value={7200}>Every 2 hours</option>
                <option value={14400}>Every 4 hours</option>
                <option value={86400}>Once daily</option>
              </select>
            </div>
          )}

          {/* Default Stay Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Minimum Stay
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.defaultMinStay}
                onChange={(e) => setSettings({ ...settings, defaultMinStay: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Maximum Stay
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.defaultMaxStay}
                onChange={(e) => setSettings({ ...settings, defaultMaxStay: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Markup Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate Markup Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.markupPercentage}
                onChange={(e) => setSettings({ ...settings, markupPercentage: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                %
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Add a percentage markup to all rates sent to Beds24
            </p>
          </div>

          {/* Sync Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sync Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncRates}
                  onChange={(e) => setSettings({ ...settings, syncRates: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Sync rates</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncAvailability}
                  onChange={(e) => setSettings({ ...settings, syncAvailability: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Sync availability</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncRestrictions}
                  onChange={(e) => setSettings({ ...settings, syncRestrictions: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Sync booking restrictions</span>
              </label>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-md p-4">
            <div className="flex">
              <RiInformationLine className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Important:</strong> Changes to these settings will affect all future syncs. 
                  Manual syncs will override automatic sync schedules.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <BiLoader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RiSave3Line className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}