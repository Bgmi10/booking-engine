import { useState, useEffect } from 'react';
import { RiMoneyDollarCircleLine, RiCheckLine, RiCalendarLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';

interface RatePolicy {
  id: string;
  name: string;
  description: string;
  basePrice?: number;
  isActive: boolean;
  refundable?: boolean;
  paymentStructure?: string;
  adjustmentPercentage?: number;
}

interface RatePolicyStepProps {
  selectedPolicy: string | null;
  onPolicyChange: (policyId: string) => void;
}

export default function RatePolicyStep({ selectedPolicy, onPolicyChange }: RatePolicyStepProps) {
  const [ratePolicies, setRatePolicies] = useState<RatePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatePolicies();
  }, []);

  const fetchRatePolicies = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/rate-policies/all`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch rate policies');
      }

      setRatePolicies(data.data.filter((policy: RatePolicy) => policy.isActive));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch rate policies');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Rate Policy Selection
        </h3>
        <p className="text-gray-600">
          Choose the rate policy to use for Beds24 pricing
        </p>
      </div>

      {ratePolicies.length > 0 ? (
        <div className="space-y-3">
          {ratePolicies.map((policy) => (
            <div
              key={policy.id}
              className={`bg-white/50 rounded-xl p-4 border cursor-pointer transition-all ${
                selectedPolicy === policy.id
                  ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                  : 'border-gray-200/50 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
              onClick={() => onPolicyChange(policy.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedPolicy === policy.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedPolicy === policy.id && (
                      <RiCheckLine className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <RiMoneyDollarCircleLine className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {policy.name}
                      </p>
                      <p className="text-xs text-gray-500 max-w-md truncate">
                        {policy.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {policy.basePrice ? `€${policy.basePrice}` : 'Variable'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Base Price
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {policy.refundable && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Refundable
                      </span>
                    )}
                    {policy.paymentStructure === 'SPLIT_PAYMENT' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Split Payment
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {policy.adjustmentPercentage !== undefined && policy.adjustmentPercentage !== 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Price Adjustment:</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      policy.adjustmentPercentage > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {policy.adjustmentPercentage > 0 ? '+' : ''}{policy.adjustmentPercentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50/50 rounded-xl p-8 border border-gray-200/50 text-center">
          <RiCalendarLine className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Rate Policies</h4>
          <p className="text-gray-600 mb-4">
            You need to create at least one active rate policy to proceed.
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            Create Rate Policy
          </button>
        </div>
      )}

      {selectedPolicy && (
        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200/50">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Selected Rate Policy</h4>
          <p className="text-sm text-blue-700">
            {ratePolicies.find(p => p.id === selectedPolicy)?.name} will be used for Beds24 pricing calculations
          </p>
        </div>
      )}

      <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-200/50">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">Pricing Information</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Base prices from rate policy will be used</li>
          <li>• Room-specific percentage adjustments will be applied</li>
          <li>• Specific date overrides will take priority</li>
          <li>• All prices will be synced in real-time to Beds24</li>
        </ul>
      </div>
    </div>
  );
}