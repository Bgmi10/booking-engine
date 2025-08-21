import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {  
  Trash2, 
  User, 
  Calendar, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import CreatorInfoModal from '../customers/CreatorInfoModal';
import toast from 'react-hot-toast';

interface DeletionLog {
  id: string;
  entityId: string;
  userId: string;
  reason: string;
  notes: string;
  createdAt: string;
  previousValues: any;
}

export default function DeletionAuditLogs() {
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchDeletionLogs();
  }, []);

  const fetchDeletionLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/audit-logs/deletions`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeletionLogs(data.data || []);
      } else {
        toast.error('Failed to fetch deletion logs');
      }
    } catch (error) {
      console.error('Error fetching deletion logs:', error);
      toast.error('Error loading deletion logs');
    } finally {
      setLoading(false);
    }
  };

  // Filter logs based on search and date
  const filteredLogs = deletionLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || 
      format(new Date(log.createdAt), 'yyyy-MM-dd') === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  const getGroupNameFromLog = (log: DeletionLog) => {
    return log.previousValues?.groupName || `Group ${log.entityId.slice(0, 8)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading deletion logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Deleted Booking Groups
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            View audit logs of all deleted booking groups to track who deleted what and when
          </p>
        </div>
        <button
          onClick={fetchDeletionLogs}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by group name, reason, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {(searchTerm || dateFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFilter('');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Deletions</div>
          <div className="text-2xl font-semibold text-red-600">{deletionLogs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Today's Deletions</div>
          <div className="text-2xl font-semibold text-orange-600">
            {deletionLogs.filter(log => 
              format(new Date(log.createdAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
            ).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Filtered Results</div>
          <div className="text-2xl font-semibold text-blue-600">{filteredLogs.length}</div>
        </div>
      </div>

      {/* Deletion Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <AlertCircle className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <div className="text-gray-500 text-base mb-1">
            {deletionLogs.length === 0 ? 'No deletions found' : 'No deletions match your filters'}
          </div>
          <div className="text-gray-400 text-sm">
            {deletionLogs.length === 0 
              ? 'No booking groups have been deleted yet' 
              : 'Try adjusting your search or date filters'
            }
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div key={log.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-red-50 rounded-full flex-shrink-0">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {getGroupNameFromLog(log)}
                        </h3>
                        <span className="text-xs text-gray-500">#{log.entityId.slice(0, 8)}</span>
                        {log.previousValues?.isAutoGrouped !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.previousValues.isAutoGrouped 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'bg-purple-50 text-purple-600'
                          }`}>
                            {log.previousValues.isAutoGrouped ? 'Auto' : 'Manual'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(log.createdAt), 'MMM dd, HH:mm')}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <button
                            onClick={() => setSelectedUserId(log.userId)}
                            className="text-blue-600 hover:text-blue-700 underline"
                          >
                            View User
                          </button>
                        </div>
                      </div>

                      {(log.reason || log.notes) && (
                        <div className="mt-2 text-xs text-gray-600">
                          {log.reason && <span className="mr-3"><strong>Reason:</strong> {log.reason}</span>}
                          {log.notes && <span><strong>Notes:</strong> {log.notes}</span>}
                        </div>
                      )}
                    </div>

                    {log.previousValues?.createdAt && (
                      <div className="text-xs text-gray-500 text-right flex-shrink-0">
                        Created: {format(new Date(log.previousValues.createdAt), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creator Info Modal */}
      {selectedUserId && (
        <CreatorInfoModal 
          userId={selectedUserId} 
          onClose={() => setSelectedUserId(null)}
          title="Deleted By"
          context="deleter"
        />
      )}
    </div>
  );
}