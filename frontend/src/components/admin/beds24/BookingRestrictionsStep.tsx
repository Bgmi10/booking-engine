import { useState, useEffect } from 'react';
import { BiLoader } from 'react-icons/bi';
import { RiCalendarLine, RiLockLine, RiCheckLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import { baseUrl } from '../../../utils/constants';
import { useBookingRestrictions } from '../../../hooks/useBookingRestrictions';
import type { BookingRestriction } from '../../../types/types';

interface BookingRestrictionsStepProps {
  selectedMappings: string[];
  syncConfiguration: {
    syncStartDate: string;
    syncEndDate: string;
  };
  onRestrictionsConfigChange: (config: {
    syncRestrictions: boolean;
    selectedRestrictions: string[];
  }) => void;
}

export default function BookingRestrictionsStep({
  selectedMappings,
  syncConfiguration,
  onRestrictionsConfigChange
}: BookingRestrictionsStepProps) {
  const { restrictions, loading, error } = useBookingRestrictions();
  const [syncRestrictions, setSyncRestrictions] = useState(true);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Auto-select relevant restrictions when restrictions or sync config changes
  useEffect(() => {
    if (restrictions.length > 0 && syncConfiguration.syncStartDate && syncConfiguration.syncEndDate) {
      const relevantRestrictions = restrictions.filter((restriction: BookingRestriction) => 
        restriction.isActive && 
        isRestrictionRelevant(restriction, syncConfiguration.syncStartDate, syncConfiguration.syncEndDate)
      );
      
      setSelectedRestrictions(relevantRestrictions.map((r: any) => r.id));
    }
  }, [restrictions, syncConfiguration.syncStartDate, syncConfiguration.syncEndDate]);

  useEffect(() => {
    onRestrictionsConfigChange({
      syncRestrictions,
      selectedRestrictions
    });
  }, [syncRestrictions, selectedRestrictions, onRestrictionsConfigChange]);

  const isRestrictionRelevant = (restriction: BookingRestriction, startDate: string, endDate: string): boolean => {
    const restrictionStart = new Date(restriction.startDate);
    const restrictionEnd = new Date(restriction.endDate);
    const syncStart = new Date(startDate);
    const syncEnd = new Date(endDate);

    // Check if there's any overlap between restriction period and sync period
    return restrictionStart <= syncEnd && restrictionEnd >= syncStart;
  };

  const getRestrictionTypeLabel = (type: string): string => {
    switch (type) {
      case 'CLOSE_TO_ARRIVAL':
        return 'Close to Arrival';
      case 'CLOSE_TO_DEPARTURE':
        return 'Close to Departure';
      case 'CLOSE_TO_STAY':
        return 'Close to Stay';
      case 'MIN_LENGTH':
        return 'Minimum Stay';
      case 'MAX_LENGTH':
        return 'Maximum Stay';
      default:
        return type;
    }
  };

  const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })}`;
  };

  const handleRestrictionToggle = (restrictionId: string) => {
    setSelectedRestrictions(prev => 
      prev.includes(restrictionId)
        ? prev.filter(id => id !== restrictionId)
        : [...prev, restrictionId]
    );
  };

  const handleTestSync = async () => {
    if (!syncConfiguration.syncStartDate || !syncConfiguration.syncEndDate) {
      toast.error('Please configure sync dates first');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${baseUrl}/admin/beds24/sync-booking-restrictions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: new Date(syncConfiguration.syncStartDate).toISOString(),
          endDate: new Date(syncConfiguration.syncEndDate).toISOString(),
          roomMappings: selectedMappings,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || 'Booking restrictions synced successfully!');
      } else {
        toast.error(data.message || 'Failed to sync booking restrictions');
      }
    } catch (error) {
      console.error('Booking restrictions sync failed:', error);
      toast.error('Failed to sync booking restrictions');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          Error loading booking restrictions: {error}
        </div>
        <p className="text-sm text-gray-500">
          Please check your network connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
          <RiLockLine className="h-6 w-6 text-orange-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configure Booking Restrictions Sync
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Choose which booking restrictions to sync to Beds24. This ensures your calendar restrictions are applied across all channels.
        </p>
      </div>

      {/* Sync Toggle */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Sync Booking Restrictions</h4>
            <p className="text-xs text-gray-600">
              Automatically sync booking restrictions to Beds24 along with rates
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={syncRestrictions}
              onChange={(e) => setSyncRestrictions(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {syncRestrictions && (
        <>
          {/* Restrictions List */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">
              Available Restrictions
              <span className="ml-2 text-xs text-gray-500">
                ({restrictions.filter(r => isRestrictionRelevant(r, syncConfiguration.syncStartDate, syncConfiguration.syncEndDate)).length} relevant for sync period)
              </span>
            </h4>
            
            {restrictions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <RiCalendarLine className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-sm font-medium text-gray-900 mb-2">No booking restrictions found</h4>
                <p className="text-xs text-gray-500">
                  Create booking restrictions in the main booking management section to sync them to Beds24.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {restrictions.map((restriction: any) => {
                  const isRelevant = isRestrictionRelevant(
                    restriction, 
                    syncConfiguration.syncStartDate, 
                    syncConfiguration.syncEndDate
                  );
                  const isSelected = selectedRestrictions.includes(restriction.id);

                  return (
                    <div
                      key={restriction.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : isRelevant
                          ? 'border-gray-200 bg-white hover:bg-gray-50'
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }`}
                      onClick={() => isRelevant && handleRestrictionToggle(restriction.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <RiCheckLine className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-900">
                                {restriction.name}
                              </h5>
                              <p className="text-xs text-gray-500">
                                {getRestrictionTypeLabel(restriction.type)} • {formatDateRange(restriction.startDate, restriction.endDate)}
                                {restriction.minLength && ` • Min: ${restriction.minLength} days`}
                                {restriction.maxLength && ` • Max: ${restriction.maxLength} days`}
                              </p>
                            </div>
                          </div>
                        </div>
                        {!isRelevant && (
                          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                            Outside sync period
                          </span>
                        )}
                        {isRelevant && !restriction.isActive && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Test Sync Button */}
          {restrictions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Test Restrictions Sync</h4>
                  <p className="text-xs text-gray-600">
                    Test the booking restrictions sync with your current configuration
                  </p>
                </div>
                <button
                  onClick={handleTestSync}
                  disabled={syncing || selectedRestrictions.length === 0}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? 'Syncing...' : 'Test Sync'}
                </button>
              </div>
              {selectedRestrictions.length === 0 && syncRestrictions && (
                <p className="text-xs text-orange-600 mt-2">
                  Select at least one restriction to test the sync
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">
              About Booking Restrictions Sync
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>
                Booking restrictions control when guests can check-in, check-out, or stay at your property. 
                Syncing these to Beds24 ensures consistent availability across all booking channels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}