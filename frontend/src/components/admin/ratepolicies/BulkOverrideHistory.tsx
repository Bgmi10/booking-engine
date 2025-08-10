import React, { useState, useEffect } from 'react';
import { RiEyeLine, RiFilterLine, RiCloseLine, RiCalendarLine, RiUser3Line, RiPriceTag3Line } from 'react-icons/ri';
import { format } from 'date-fns';
import { baseUrl } from '../../../utils/constants';
import { toast } from 'react-hot-toast';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Loader from '../../Loader';
import type { BulkOverrideLog, User } from '../../../types/types';

interface BulkOverrideHistoryProps {
  ratePolicyId?: string;
  onClose?: () => void;
}

const BulkOverrideHistory: React.FC<BulkOverrideHistoryProps> = ({ ratePolicyId, onClose }) => {
  const [logs, setLogs] = useState<BulkOverrideLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<BulkOverrideLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueUsers, setUniqueUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  
  const [filters, setFilters] = useState({
    actionType: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    userId: ''
  });
  
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    pages: 0
  });

  // Fetch all unique users who have performed bulk overrides
  const fetchUniqueUsers = async () => {
    try {
      // Fetch a larger set to get all unique users
      const response = await fetch(
        `${baseUrl}/admin/bulk-override-logs?limit=100&offset=0`,
        { credentials: 'include' }
      );
      
      const data = await response.json();
      
      if (response.ok && data.data.logs.length > 0) {
        const users = data.data.logs.reduce((acc: any[], log: BulkOverrideLog) => {
          if (!acc.find(u => u.id === log.user.id)) {
            acc.push({
              id: log.user.id,
              name: log.user.name,
              email: log.user.email
            });
          }
          return acc;
        }, []);
        setUniqueUsers(users.sort((a: User, b: User) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error('Error fetching unique users:', error);
    }
  };

  const fetchLogs = async (resetOffset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (ratePolicyId) params.append('ratePolicyId', ratePolicyId);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.userId) params.append('userId', filters.userId);
      
      params.append('limit', pagination.limit.toString());
      params.append('offset', resetOffset ? '0' : pagination.offset.toString());
      params.append('sortBy', 'createdAt');
      params.append('sortOrder', 'desc');

      const response = await fetch(
        `${baseUrl}/admin/bulk-override-logs?${params.toString()}`,
        { credentials: 'include' }
      );

      const data = await response.json();
      
      if (response.ok) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
        if (resetOffset) {
          setPagination(prev => ({ ...prev, offset: 0 }));
        }
      } else {
        toast.error(data.message || 'Failed to fetch bulk override history');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to fetch bulk override history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [ratePolicyId, filters]);

  useEffect(() => {
    if (pagination.offset > 0) {
      fetchLogs(false);
    }
  }, [pagination.offset]);

  // Fetch unique users on component mount
  useEffect(() => {
    fetchUniqueUsers();
  }, []);

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'BULK_INCREASE': return 'bg-green-50 text-green-700 border-green-200';
      case 'BULK_DECREASE': return 'bg-red-50 text-red-700 border-red-200';
      case 'BULK_OVERRIDE': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'BULK_INCREASE': return 'Price Increase';
      case 'BULK_DECREASE': return 'Price Decrease';
      case 'BULK_OVERRIDE': return 'Price Override';
      default: return actionType;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* iOS-style Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Override History</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {ratePolicyId ? 'Viewing history for current rate policy' : 'Complete audit log of bulk price changes'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <RiFilterLine className="w-5 h-5" />
            </button>
            {onClose && (
              <button 
                onClick={onClose} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* iOS-style Filters */}
        {showFilters && (
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Action Type</label>
                <select
                  value={filters.actionType}
                  onChange={(e) => setFilters(prev => ({ ...prev, actionType: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Actions</option>
                  <option value="BULK_INCREASE">Price Increases</option>
                  <option value="BULK_DECREASE">Price Decreases</option>
                  <option value="BULK_OVERRIDE">Price Overrides</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">User</label>
                <select
                  value={filters.userId}
                  onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Users</option>
                  {uniqueUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">From Date</label>
                <DatePicker
                  selected={filters.startDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Start date"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">To Date</label>
                <DatePicker
                  selected={filters.endDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="End date"
                  //@ts-ignore
                  minDate={filters.startDate}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => setFilters({ actionType: '', startDate: null, endDate: null, userId: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <RiCalendarLine className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">No history found</p>
              <p className="text-gray-400 text-sm mt-1">Bulk override actions will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getActionTypeColor(log.actionType)}`}>
                          {getActionTypeLabel(log.actionType)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-1.5">
                          <RiUser3Line className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 font-medium">{log.user.name}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{log.user.role}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1.5">
                          <RiPriceTag3Line className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{log.ratePolicy.name}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          {format(new Date(log.dateRangeStart), 'dd/MM/yyyy')} - {format(new Date(log.dateRangeEnd), 'dd/MM/yyyy')}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>
                          <strong>{log.totalRoomsAffected}</strong> rooms
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>
                          <strong>{log.totalDatesAffected}</strong> dates
                        </span>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <RiEyeLine className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* iOS-style Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="text-sm text-gray-600">
              Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.offset === 0}
                onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedLog && (
          <BulkOverrideLogDetail 
            log={selectedLog} 
            onClose={() => setSelectedLog(null)} 
          />
        )}
      </div>
    </div>
  );
};

export default BulkOverrideHistory;

// Detail Modal Component
function BulkOverrideLogDetail({ log, onClose }: { log: BulkOverrideLog; onClose: () => void }) {

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'BULK_INCREASE': return 'bg-green-50 text-green-700 border-green-200';
      case 'BULK_DECREASE': return 'bg-red-50 text-red-700 border-red-200';
      case 'BULK_OVERRIDE': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'BULK_INCREASE': return 'Price Increase';
      case 'BULK_DECREASE': return 'Price Decrease';
      case 'BULK_OVERRIDE': return 'Price Override';
      default: return actionType;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Override Details</h3>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getActionTypeColor(log.actionType)}`}>
                {getActionTypeLabel(log.actionType)}
              </span>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <RiCloseLine className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Action Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Action Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Performed by</span>
                    <p className="font-medium text-gray-900 mt-0.5">{log.user.name}</p>
                    <p className="text-xs text-gray-500">{log.user.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date & Time</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {format(new Date(log.createdAt), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(log.createdAt), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Impact Summary */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Impact Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Rate Policy</span>
                    <p className="font-medium text-gray-900 mt-0.5">{log.ratePolicy.name}</p>
                    {log.ratePolicy.description && (
                      <p className="text-xs text-gray-500 mt-1">{log.ratePolicy.description}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Date Range</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {format(new Date(log.dateRangeStart), 'dd/MM/yyyy')} - {format(new Date(log.dateRangeEnd), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Rooms Affected</span>
                    <p className="font-medium text-gray-900 mt-0.5">{log.totalRoomsAffected} rooms</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Dates Modified</span>
                    <p className="font-medium text-gray-900 mt-0.5">{log.totalDatesAffected} dates</p>
                  </div>
                </div>
              </div>

              {/* Price Changes Summary */}
              {log.overRideDetails?.summary && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Price Changes</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total price updates</span>
                      <span className="font-medium text-gray-900">
                        {log.overRideDetails.summary.totalPriceUpdates || log.totalRoomsAffected * log.totalDatesAffected}
                      </span>
                    </div>
                    {log.overRideDetails.summary.averageIncrease && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Average change</span>
                        <span className="font-medium text-gray-900">
                          {log.overRideDetails.summary.averageIncrease > 0 ? '+' : ''}{log.overRideDetails.summary.averageIncrease.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}