import { useState } from 'react';
import { X, History, Eye, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import ComprehensivePaymentIntentEditForm from './ComprehensivePaymentIntentEditForm';
import CreatorInfoModal from '../customers/CreatorInfoModal';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentIntent: any;
  auditLogs: any[];
  auditLogsLoading: boolean;
}

export default function AuditLogModal({ 
  isOpen, 
  onClose, 
  paymentIntent, 
  auditLogs, 
  auditLogsLoading 
}: AuditLogModalProps) {
  const [showingState, setShowingState] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleViewPreviousState = (log: any) => {
    // For previous state, we need to reconstruct what the data looked like before the change
    let previousPaymentIntent = { ...paymentIntent };
    
    if (log.previousValues) {
      // If we have explicit previous values, use them
      previousPaymentIntent = {
        ...paymentIntent,
        ...log.previousValues,
        bookingData: log.previousValues.bookingData || paymentIntent.bookingData,
        adminNotes: log.previousValues.adminNotes || paymentIntent.adminNotes,
      };
    }
    
    setShowingState({
      type: 'previous',
      log,
      paymentIntent: previousPaymentIntent,
      changedFields: log.changedFields || [],
      title: 'Previous State'
    });
  };

  const handleViewNewState = (log: any) => {
    // For new state, use the current payment intent data or explicit new values
    let newPaymentIntent = { ...paymentIntent };
    
    if (log.newValues) {
      // If we have explicit new values, use them
      newPaymentIntent = {
        ...paymentIntent,
        ...log.newValues,
        bookingData: log.newValues.bookingData || paymentIntent.bookingData,
        adminNotes: log.newValues.adminNotes || paymentIntent.adminNotes,
      };
    }
    
    setShowingState({
      type: 'new',
      log,
      paymentIntent: newPaymentIntent,
      changedFields: log.changedFields || [],
      title: 'New State'
    });
  };

  const closeStateViewer = () => {
    setShowingState(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Audit History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {auditLogsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading audit history...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-900">No audit history found</p>
              <p className="text-sm text-gray-600 mt-1">No changes have been recorded for this booking yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.actionType === 'CREATE' ? 'bg-green-100 text-green-800' :
                          log.actionType === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          log.actionType === 'DELETE' ? 'bg-red-100 text-red-800' :
                          log.actionType === 'REFUND' ? 'bg-orange-100 text-orange-800' :
                          log.actionType === 'CANCEL' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.actionType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                        </span>
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
                      <p className="text-sm font-medium text-gray-900">
                        {log.entityType} {log.actionType.toLowerCase()}
                      </p>
                      {log.reason && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Reason:</span> {log.reason}
                        </p>
                      )}
                      {log.notes && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Notes:</span> {log.notes}
                        </p>
                      )}
                    </div>
                    
                    {/* Previous/New Change Buttons */}
                    {(log.actionType === 'UPDATE' || log.actionType === 'EDITED' || log.actionType === 'DATES_CHANGED') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewPreviousState(log)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-300 rounded hover:bg-orange-100 transition-colors"
                        >
                          <ArrowLeft className="h-3 w-3 mr-1" />
                          Previous
                        </button>
                        <button
                          onClick={() => handleViewNewState(log)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-300 rounded hover:bg-green-100 transition-colors"
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          New
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* State Viewer Modal */}
      {showingState && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-4">
            <div className="mb-4 pb-3 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  {showingState.type === 'previous' ? (
                    <>
                      <ArrowLeft className="h-5 w-5 text-orange-600" />
                      <span className="text-orange-600">Previous State</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-5 w-5 text-green-600" />
                      <span className="text-green-600">New State</span>
                    </>
                  )}
                </h3>
                <p className="text-sm text-gray-600">
                  Changed on {format(new Date(showingState.log.createdAt), 'MMM dd, yyyy HH:mm')}
                  {showingState.log.userId && ' by user'}
                </p>
              </div>
              <button
                onClick={closeStateViewer}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <ComprehensivePaymentIntentEditForm
              paymentIntent={showingState.paymentIntent}
              onClose={closeStateViewer}
              onUpdate={() => {}} // No-op since this is read-only
              isReadOnly={true}
              changedFields={showingState.changedFields}
              readOnlyTitle={showingState.title}
            />
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {selectedUserId && (
        <CreatorInfoModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          title="User Information"
          context="audit"
        />
      )}
    </div>
  );
}