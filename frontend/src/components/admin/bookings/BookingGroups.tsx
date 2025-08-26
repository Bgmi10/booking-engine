import { useState } from 'react';
import { Plus, Search, RefreshCw, Filter, Trash2 } from 'lucide-react';
import { useBookingGroups } from '../../../hooks/useBookingGroups';
import type { BookingGroup } from '../../../types/types';
import BookingGroupCard from './BookingGroupCard';
import BookingGroupModal from './BookingGroupModal';
import BookingGroupEditModal from './BookingGroupEditModal';
import BookingGroupCreateModal from './BookingGroupCreateModal';
import DeletionAuditLogs from './DeletionAuditLogs';

export default function BookingGroups({ handleViewBookings, handleEditGroup, filteredGroups, filterType, filterStatus, setFilterType, setFilterStatus, selectedGroup, setSelectedGroup, showEditModal, setShowEditModal, showGroupModal, setShowGroupModal, searchTerm, setSearchTerm }: { selectedGroup: BookingGroup | null, setSelectedGroup: any, showEditModal: boolean, setShowEditModal: (b: boolean) => void, handleViewBookings: (group: BookingGroup) => void, setFilterType: (e: string) => void, setFilterStatus  : (e: string) => void, filteredGroups: BookingGroup[], filterType: string, filterStatus: string, handleEditGroup: (group: BookingGroup) => void, showGroupModal: boolean, setShowGroupModal: (b: boolean) => void, searchTerm: string, setSearchTerm: (term: string) => void }) {
  const {
    bookingGroups,
    loading,
    error,
    refetch,
    deleteBookingGroup,
  } = useBookingGroups();

  const [activeTab, setActiveTab] = useState<'groups' | 'deletions'>('groups');
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error loading booking groups: {error}</div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Booking Groups</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage booking groups and view deletion history
              </p>
            </div>
          </div>
  
          {/* Tab Navigation */}
          <div className="flex justify-between space-x-2">
            <div className='flex space-x-2'>
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Groups ({bookingGroups.length})
            </button>
            <button
              onClick={() => setActiveTab('deletions')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'deletions'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              Deletion History
            </button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={refetch}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
  
        {/* Tab Content */}
        {activeTab === 'groups' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search groups by name or customer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
  
                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">All Types</option>
                    <option value="AUTO">Auto-grouped</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
  
                {/* Status Filter */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">All Status</option>
                    <option value="OUTSTANDING">Outstanding</option>
                    <option value="PAID">Fully Paid</option>
                  </select>
                </div>
              </div>
            </div>
  
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Total Groups</div>
                <div className="text-2xl font-semibold text-gray-900">{bookingGroups.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Auto-grouped</div>
                <div className="text-2xl font-semibold text-blue-600">
                  {bookingGroups.filter((g) => g.isAutoGrouped).length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Outstanding Balance</div>
                <div className="text-2xl font-semibold text-orange-600">
                  €
                  {bookingGroups
                    .reduce((sum, g) => sum + (g.outstandingAmount || 0), 0)
                    .toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Total Bookings</div>
                <div className="text-2xl font-semibold text-green-600">
                  {bookingGroups.reduce(
                    (sum, g) =>
                      sum + g.paymentIntents.reduce((piSum, pi) => piSum + pi.bookings.length, 0),
                    0
                  )}
                </div>
              </div>
            </div>
  
            {/* Groups List */}
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="text-gray-500 text-lg mb-2">No booking groups found</div>
                <div className="text-gray-400 text-sm">
                  {searchTerm || filterType !== 'ALL' || filterStatus !== 'ALL'
                    ? 'Try adjusting your search or filters'
                    : 'Create your first booking group to get started'}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredGroups.map((group) => (
                  <BookingGroupCard
                    key={group.id}
                    group={group}
                    onViewBookings={handleViewBookings}
                    onEdit={handleEditGroup}
                    onRefresh={refetch}
                    isMergedView={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
  
        {activeTab === 'deletions' && <DeletionAuditLogs />}
  
        {/* Modals */}
        {showCreateModal && (
          <BookingGroupCreateModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        )}
  
        {showGroupModal && selectedGroup && (
          <BookingGroupModal
            group={selectedGroup}
            onClose={() => {
              setShowGroupModal(false);
              setSelectedGroup(null);
            }}
            onRefresh={refetch}
            onDelete={async (groupId, reason) => {
              await deleteBookingGroup(groupId, reason || 'Deleted via booking group modal');
              setShowGroupModal(false);
              setSelectedGroup(null);
            }}
          />
        )}
  
        {showEditModal && selectedGroup && (
          <BookingGroupEditModal
            group={selectedGroup}
            onClose={() => {
              setShowEditModal(false);
              setSelectedGroup(null);
            }}
            onSave={() => {
              setShowEditModal(false);
              setSelectedGroup(null);
              refetch();
            }}
          />
        )}
      </div>
    </>
  );
  
}