import { useState, useEffect } from 'react';
import { X, Save, Users, Plus, Trash2, Search } from 'lucide-react';
import { useBookingGroups } from '../../../hooks/useBookingGroups';
import type { BookingGroup } from '../../../types/types';
import { usePaymentIntents } from '../../../hooks/usePaymentIntents';
import toast from 'react-hot-toast';

interface BookingGroupEditModalProps {
  group: BookingGroup;
  onClose: () => void;
  onSave: () => void;
}

export default function BookingGroupEditModal({ group, onClose, onSave }: BookingGroupEditModalProps) {
  const [groupName, setGroupName] = useState(group.groupName || '');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  
  // For managing payment intents
  const [searchTerm, setSearchTerm] = useState('');
  const [availablePaymentIntents, setAvailablePaymentIntents] = useState<any[]>([]);
  const [selectedPaymentIntents, setSelectedPaymentIntents] = useState<string[]>([]);
  const [removingPaymentIntents, setRemovingPaymentIntents] = useState<string[]>([]);

  const { updateBookingGroup, addPaymentIntentsToGroup, removePaymentIntentsFromGroup } = useBookingGroups();
  const { paymentIntents: allPaymentIntents, loading: loadingPaymentIntents } = usePaymentIntents();

  useEffect(() => {
    if (allPaymentIntents) {
      // Filter out payment intents that are already in this group or another group
      const available = allPaymentIntents.filter(pi => 
        !pi.bookingGroupId && 
        !group.paymentIntents.some(groupPi => groupPi.id === pi.id)
      );
      setAvailablePaymentIntents(available);
    }
  }, [allPaymentIntents, group.paymentIntents]);

  const filteredAvailablePaymentIntents = availablePaymentIntents.filter(pi => {
    if (!searchTerm) return true;
    const customer = pi.customer || pi.customerData;
    return (
      customer?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSaveDetails = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    setIsLoading(true);
    try {
      await updateBookingGroup(group.id, {
        groupName: groupName.trim(),
        reason: reason.trim() || 'Updated group details via admin interface'
      });
      
      toast.success('Group details updated successfully');
      onSave();
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentIntents = async () => {
    if (selectedPaymentIntents.length === 0) {
      toast.error('Please select payment intents to add');
      return;
    }

    setIsLoading(true);
    try {
      await addPaymentIntentsToGroup(
        group.id, 
        selectedPaymentIntents,
        reason.trim() || 'Added payment intents via admin interface'
      );
      
      setSelectedPaymentIntents([]);
      setReason('');
      onSave(); // This will refresh the parent data
    } catch (error) {
      console.error('Error adding payment intents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePaymentIntents = async () => {
    if (removingPaymentIntents.length === 0) {
      toast.error('Please select payment intents to remove');
      return;
    }

    setIsLoading(true);
    try {
      await removePaymentIntentsFromGroup(
        removingPaymentIntents,
        reason.trim() || 'Removed payment intents via admin interface'
      );
      
      setRemovingPaymentIntents([]);
      setReason('');
      onSave(); // This will refresh the parent data
    } catch (error) {
      console.error('Error removing payment intents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePaymentIntentSelection = (paymentIntentId: string, isRemoving = false) => {
    if (isRemoving) {
      setRemovingPaymentIntents(prev => 
        prev.includes(paymentIntentId)
          ? prev.filter(id => id !== paymentIntentId)
          : [...prev, paymentIntentId]
      );
    } else {
      setSelectedPaymentIntents(prev => 
        prev.includes(paymentIntentId)
          ? prev.filter(id => id !== paymentIntentId)
          : [...prev, paymentIntentId]
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Edit Booking Group
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {group.groupName || `Group ${group.id.slice(0, 8)}`} • {group._count.paymentIntents} payment intents
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Group Details
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Manage Members
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter group name"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Update
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional reason for this update"
                  disabled={isLoading}
                />
              </div>

              {/* Group Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Current Group Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium">
                      {group.isAutoGrouped ? 'Auto-grouped' : 'Manual'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Intents:</span>
                    <span className="ml-2 font-medium">{group._count.paymentIntents}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Outstanding:</span>
                    <span className="ml-2 font-medium">€{(group.outstandingAmount || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Charges:</span>
                    <span className="ml-2 font-medium">{group._count.charges}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetails}
                  disabled={isLoading || !groupName.trim()}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Current Members */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Current Group Members</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {group.paymentIntents.map((pi) => (
                    <div key={pi.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={removingPaymentIntents.includes(pi.id)}
                          onChange={() => togglePaymentIntentSelection(pi.id, true)}
                          className="rounded border-gray-300"
                          disabled={isLoading}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {pi.customer 
                              ? `${pi.customer.guestFirstName} ${pi.customer.guestLastName}` 
                              : 'Unknown Customer'
                            }
                          </p>
                          <p className="text-xs text-gray-600">
                            #{pi.id.slice(-8)} • €{pi.totalAmount} • {pi.bookings.length} bookings
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pi.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {pi.status}
                      </span>
                    </div>
                  ))}
                </div>
                
                {removingPaymentIntents.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={handleRemovePaymentIntents}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Selected ({removingPaymentIntents.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Add New Members */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Add Payment Intents to Group</h4>
                
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search available payment intents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>

                {loadingPaymentIntents ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-xs text-gray-600 mt-2">Loading payment intents...</p>
                  </div>
                ) : filteredAvailablePaymentIntents.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">No available payment intents found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchTerm 
                        ? 'Try adjusting your search terms' 
                        : 'All payment intents are already in groups or none are available'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {filteredAvailablePaymentIntents.map((pi) => {
                        const customer = pi.customer || pi.customerData;
                        return (
                          <div key={pi.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedPaymentIntents.includes(pi.id)}
                                onChange={() => togglePaymentIntentSelection(pi.id, false)}
                                className="rounded border-gray-300"
                                disabled={isLoading}
                              />
                              <div>
                                <p className="text-sm font-medium">
                                  {customer 
                                    ? `${customer.firstName || customer.guestFirstName} ${customer.lastName || customer.guestLastName}` 
                                    : 'Unknown Customer'
                                  }
                                </p>
                                <p className="text-xs text-gray-600">
                                  #{pi.id.slice(-8)} • €{pi.totalAmount}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              pi.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {pi.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {selectedPaymentIntents.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={handleAddPaymentIntents}
                          disabled={isLoading}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Selected ({selectedPaymentIntents.length})
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Reason field for member changes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Member Changes
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Optional reason for adding/removing members"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}