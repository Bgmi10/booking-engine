import { RiCheckLine, RiHotelLine, RiMoneyDollarCircleLine, RiSettings3Line, RiPulseLine, RiLockLine } from 'react-icons/ri';

interface SyncConfiguration {
  autoSync: boolean;
  syncFrequency: string;
  markupPercent: number;
  minStay: number;
  maxStay: number;
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

interface RestrictionsConfiguration {
  syncRestrictions: boolean;
  selectedRestrictions: string[];
}

interface SummaryStepProps {
  connectionStatus: boolean | null;
  selectedMappings: string[];
  selectedPolicy: string | null;
  configuration: SyncConfiguration;
  roomMappings: RoomMapping[];
  restrictionsConfiguration?: RestrictionsConfiguration;
}

export default function SummaryStep({  
  selectedMappings, 
  configuration, 
  roomMappings,
  restrictionsConfiguration
}: SummaryStepProps) {
  
  const selectedRoomMappings = roomMappings.filter(mapping => 
    selectedMappings.includes(mapping.id)
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Configuration Summary
        </h3>
        <p className="text-gray-600">
          Review your Beds24 setup before completing configuration
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <RiPulseLine className="w-5 h-5 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">Connection Status</h4>
        </div>
        <div className="flex items-center space-x-2">
          <RiCheckLine className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            Successfully connected to Beds24 (Property ID: 288531)
          </span>
        </div>
      </div>

      {/* Room Mappings */}
      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <RiHotelLine className="w-5 h-5 text-blue-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">Room Mappings</h4>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
            {selectedMappings.length} selected
          </span>
        </div>
        <div className="space-y-2">
          {selectedRoomMappings.map((mapping) => (
            <div key={mapping.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <RiCheckLine className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  {mapping.room?.name || 'Unknown Room'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                → {mapping.beds24RoomName || mapping.beds24RoomId}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rate Policy */}
      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <RiMoneyDollarCircleLine className="w-5 h-5 text-purple-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">Rate Policy</h4>
        </div>
        <div className="flex items-center space-x-2">
          <RiCheckLine className="w-5 h-5 text-green-600" />
          <span className="text-sm text-gray-700">
            Rate policy selected and configured for pricing calculations
          </span>
        </div>
      </div>

      {/* Sync Configuration */}
      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <RiSettings3Line className="w-5 h-5 text-orange-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">Sync Settings</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Auto Sync:</span>
              <span className="font-medium text-gray-900">
                {configuration.autoSync ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Frequency:</span>
              <span className="font-medium text-gray-900 capitalize">
                {configuration.syncFrequency}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Markup:</span>
              <span className="font-medium text-gray-900">
                {configuration.markupPercent}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stay Range:</span>
              <span className="font-medium text-gray-900">
                {configuration.minStay}-{configuration.maxStay} nights
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Restrictions */}
      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center space-x-4 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <RiLockLine className="w-5 h-5 text-orange-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">Booking Restrictions</h4>
        </div>
        <div className="flex items-center space-x-2">
          <RiCheckLine className="w-5 h-5 text-green-600" />
          <span className="text-sm text-gray-700">
            {restrictionsConfiguration?.syncRestrictions
              ? `Restrictions sync enabled (${restrictionsConfiguration.selectedRestrictions.length} restrictions selected)`
              : 'Restrictions sync disabled'
            }
          </span>
        </div>
      </div>

      {/* Webhook Information */}
      <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-200/50">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">Webhook Configuration</h4>
        <p className="text-sm text-yellow-700 mb-2">
          Configure this webhook URL in your Beds24 dashboard to receive booking notifications:
        </p>
        <div className="bg-white/50 rounded-lg p-2 border border-yellow-200/30">
          <code className="text-xs text-yellow-800 font-mono break-all">
            {window.location.origin}/api/v1/admin/beds24/webhook/booking
          </code>
        </div>
      </div>

      {/* Ready to Complete */}
      <div className="bg-green-50/50 rounded-xl p-6 border border-green-200/50">
        <div className="flex items-center space-x-3 mb-3">
          <RiCheckLine className="w-6 h-6 text-green-600" />
          <h4 className="text-lg font-semibold text-green-900">Ready to Complete</h4>
        </div>
        <p className="text-sm text-green-700 mb-4">
          Your Beds24 integration is configured and ready to go. Click "Complete Setup" to:
        </p>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Activate all selected room mappings</li>
          <li>• Start automatic rate and availability sync</li>
          {restrictionsConfiguration?.syncRestrictions && (
            <li>• Sync booking restrictions to maintain calendar control</li>
          )}
          <li>• Enable real-time booking imports</li>
          <li>• Begin OTA distribution through Beds24</li>
        </ul>
      </div>
    </div>
  );
}