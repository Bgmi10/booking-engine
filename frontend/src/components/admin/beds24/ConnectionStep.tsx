import { BiLoader } from 'react-icons/bi';
import { RiPulseLine, RiRefreshLine, RiCheckLine, RiCloseLine } from 'react-icons/ri';

interface ConnectionStepProps {
  connectionStatus: boolean | null;
  testingConnection: boolean;
  onTestConnection: () => void;
}

export default function ConnectionStep({ 
  connectionStatus, 
  testingConnection, 
  onTestConnection 
}: ConnectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Connect to Beds24
        </h3>
        <p className="text-gray-600">
          Establish connection with your Beds24 channel manager account
        </p>
      </div>

      <div className="bg-white/50 rounded-xl p-6 border border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-full ${
              connectionStatus === null ? 'bg-gray-100' :
              connectionStatus ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {connectionStatus === null ? (
                <RiPulseLine className="w-8 h-8 text-gray-400" />
              ) : connectionStatus ? (
                <RiCheckLine className="w-8 h-8 text-green-600" />
              ) : (
                <RiCloseLine className="w-8 h-8 text-red-600" />
              )}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                Connection Status
              </h4>
              <p className={`text-sm ${
                connectionStatus === null ? 'text-gray-500' :
                connectionStatus ? 'text-green-600' : 'text-red-600'
              }`}>
                {connectionStatus === null ? 'Not tested yet' :
                 connectionStatus ? 'Connected to Beds24' : 'Connection failed'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onTestConnection}
            disabled={testingConnection}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testingConnection ? (
              <BiLoader className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <RiRefreshLine className="w-5 h-5 mr-2" />
            )}
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {connectionStatus && (
        <div className="bg-green-50/50 rounded-xl p-6 border border-green-200/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-green-700">API Status</p>
              <p className="mt-1 text-lg font-semibold text-green-900">Connected</p>
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Property ID</p>
              <p className="mt-1 text-lg font-semibold text-green-900">288531</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-200/50">
        <h4 className="text-sm font-medium text-blue-800 mb-3">Configuration Details</h4>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex justify-between">
            <span>API Key:</span>
            <span className="font-mono">097b...1691</span>
          </div>
          <div className="flex justify-between">
            <span>Property ID:</span>
            <span className="font-mono">288531</span>
          </div>
          <div className="flex justify-between">
            <span>Environment:</span>
            <span>Production</span>
          </div>
        </div>
      </div>

      {!connectionStatus && connectionStatus !== null && (
        <div className="bg-red-50/50 rounded-xl p-6 border border-red-200/50">
          <h4 className="text-sm font-medium text-red-800 mb-2">Connection Failed</h4>
          <p className="text-sm text-red-700">
            Please check your API credentials and ensure your IP is whitelisted in Beds24 dashboard.
          </p>
        </div>
      )}
    </div>
  );
}