import { useState, useEffect } from 'react';
import { RiCloseLine, RiAddLine, RiDeleteBinLine, RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';
import { useRatePolicies } from '../../../hooks/useRatePolicies';

interface RoomMapping {
  id: string;
  localRoomId: string;
  beds24RoomId: string;
  beds24RoomName?: string;
  room?: {
    id: string;
    name: string;
  };
}

interface RatePolicyMapping {
  id?: string;
  ratePolicyId: string;
  priceSlot: number;
  markupPercent?: number;
  channelRateCode?: string;
  priority: number;
  isActive: boolean;
  ratePolicy?: {
    id: string;
    name: string;
    description: string;
    basePrice: number;
  };
}

interface RatePolicyMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomMapping: RoomMapping;
  onUpdate: () => void;
}

export default function RatePolicyMappingModal({
  isOpen,
  onClose,
  roomMapping,
  onUpdate
}: RatePolicyMappingModalProps) {
  const { ratePolicies, loading: policiesLoading } = useRatePolicies();
  const [mappings, setMappings] = useState<RatePolicyMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && roomMapping) {
      fetchRatePolicyMappings();
    }
  }, [isOpen, roomMapping]);

  const fetchRatePolicyMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${baseUrl}/admin/beds24/room-mappings/${roomMapping.id}/rate-policies`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setMappings(data.data || []);
      } else {
        toast.error('Failed to fetch rate policy mappings');
      }
    } catch (error) {
      console.error('Error fetching rate policy mappings:', error);
      toast.error('Failed to fetch rate policy mappings');
    } finally {
      setLoading(false);
    }
  };

  const addMapping = () => {
    const nextSlot = Math.max(...mappings.map(m => m.priceSlot), 0) + 1;
    if (nextSlot > 16) {
      toast.error('Maximum 16 rate policies can be mapped');
      return;
    }

    const availablePolicies = ratePolicies.filter(
      policy => !mappings.some(m => m.ratePolicyId === policy.id)
    );

    if (availablePolicies.length === 0) {
      toast.error('All rate policies are already mapped');
      return;
    }

    setMappings([
      ...mappings,
      {
        ratePolicyId: availablePolicies[0].id,
        priceSlot: nextSlot,
        priority: nextSlot,
        isActive: true,
        ratePolicy: availablePolicies[0]
      }
    ]);
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, updates: Partial<RatePolicyMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    
    // If rate policy changed, update the ratePolicy object
    if (updates.ratePolicyId) {
      const policy = ratePolicies.find(p => p.id === updates.ratePolicyId);
      if (policy) {
        newMappings[index].ratePolicy = policy;
      }
    }
    
    setMappings(newMappings);
  };

  const moveMapping = (index: number, direction: 'up' | 'down') => {
    const newMappings = [...mappings];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= mappings.length) return;
    
    // Swap price slots
    const tempSlot = newMappings[index].priceSlot;
    newMappings[index].priceSlot = newMappings[targetIndex].priceSlot;
    newMappings[targetIndex].priceSlot = tempSlot;
    
    // Swap array positions
    [newMappings[index], newMappings[targetIndex]] = [newMappings[targetIndex], newMappings[index]];
    
    setMappings(newMappings);
  };

  const saveMappings = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(
        `${baseUrl}/admin/beds24/room-mappings/${roomMapping.id}/rate-policies`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mappings })
        }
      );

      if (response.ok) {
        toast.success('Rate policy mappings saved successfully');
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save rate policy mappings');
      }
    } catch (error) {
      console.error('Error saving rate policy mappings:', error);
      toast.error('Failed to save rate policy mappings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configure Rate Policies
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {roomMapping.room?.name} → {roomMapping.beds24RoomName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading || policiesLoading ? (
            <div className="flex items-center justify-center h-64">
              <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  How Rate Policy Mapping Works
                </h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Map up to 16 different rate policies to this Beds24 room</li>
                  <li>Each rate will be synced as p1, p2, p3... up to p16 in Beds24</li>
                  <li>You can add channel-specific markup percentages</li>
                  <li>Configure rate codes for specific channels (e.g., Booking.com)</li>
                </ul>
              </div>

              {/* Mappings List */}
              <div className="space-y-3">
                {mappings.map((mapping, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start gap-4">
                      {/* Price Slot */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-700">
                            p{mapping.priceSlot}
                          </span>
                        </div>
                      </div>

                      {/* Rate Policy Selection */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rate Policy
                          </label>
                          <select
                            value={mapping.ratePolicyId}
                            onChange={(e) => updateMapping(index, { ratePolicyId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            {ratePolicies.map(policy => (
                              <option key={policy.id} value={policy.id}>
                                {policy.name} (€{policy.basePrice})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Channel Markup %
                          </label>
                          <input
                            type="number"
                            value={mapping.markupPercent || ''}
                            onChange={(e) => updateMapping(index, { 
                              markupPercent: e.target.value ? parseFloat(e.target.value) : undefined 
                            })}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Channel Rate Code
                          </label>
                          <input
                            type="text"
                            value={mapping.channelRateCode || ''}
                            onChange={(e) => updateMapping(index, { channelRateCode: e.target.value })}
                            placeholder="Optional"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => moveMapping(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <RiArrowUpLine size={16} />
                        </button>
                        <button
                          onClick={() => moveMapping(index, 'down')}
                          disabled={index === mappings.length - 1}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <RiArrowDownLine size={16} />
                        </button>
                        <button
                          onClick={() => removeMapping(index)}
                          className="p-1 hover:bg-red-100 text-red-600 rounded"
                          title="Remove"
                        >
                          <RiDeleteBinLine size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Toggle Active */}
                    <div className="mt-3 flex items-center">
                      <input
                        type="checkbox"
                        id={`active-${index}`}
                        checked={mapping.isActive}
                        onChange={(e) => updateMapping(index, { isActive: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`active-${index}`} className="ml-2 text-sm text-gray-700">
                        Active
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Button */}
              {mappings.length < 16 && (
                <button
                  onClick={addMapping}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center"
                >
                  <RiAddLine className="w-5 h-5 mr-2" />
                  Add Rate Policy
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={saveMappings}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </div>
    </div>
  );
}