import { useState, useEffect } from 'react';
import { X, History, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import CreatorInfoModal from '../customers/CreatorInfoModal';
import toast from 'react-hot-toast';

interface BookingGroupAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName?: string;
  fetchAuditLogs: () => Promise<any[]>;
}

export default function BookingGroupAuditModal({ 
  isOpen, 
  onClose, 
  groupId,
  groupName,
  fetchAuditLogs
}: BookingGroupAuditModalProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs();
    }
  }, [isOpen]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit logs');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATED':
      case 'GROUP_CREATED':
        return 'bg-green-100 text-green-800';
      case 'EDITED':
      case 'GROUP_UPDATED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
      case 'GROUP_DELETED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeText = (actionType: string) => {
    return actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit History - {groupName || `Group ${groupId.slice(0, 8)}`}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Loading audit history...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-900">No audit history found</p>
                <p className="text-sm text-gray-600 mt-1">No changes have been recorded for this booking group yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="bg-gray-50 rounded-md p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(log.actionType)}`}>
                            {getActionTypeText(log.actionType)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900">
                            {log.entityType} {getActionTypeText(log.actionType)}
                          </p>
                          
                          {log.reason && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Reason:</span> {log.reason}
                            </p>
                          )}
                          
                          {log.notes && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Notes:</span> {log.notes}
                            </p>
                          )}

                          {log.changedFields && log.changedFields.length > 0 && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Changed Fields:</span> {log.changedFields.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {log.userId && (
                          <button
                            onClick={() => setSelectedUserId(log.userId)}
                            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <User className="h-3 w-3 mr-1" />
                            View User
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Show previous/new values for certain actions */}
                    {(log.previousValues || log.newValues) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {log.previousValues && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Previous Values:</p>
                              <pre className="bg-red-50 p-2 rounded text-red-800 overflow-x-auto">
                                {JSON.stringify(log.previousValues, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValues && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">New Values:</p>
                              <pre className="bg-green-50 p-2 rounded text-green-800 overflow-x-auto">
                                {JSON.stringify(log.newValues, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Info Modal */}
      {selectedUserId && (
        <CreatorInfoModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          title="User Information"
          context="audit"
        />
      )}
    </>
  );
}