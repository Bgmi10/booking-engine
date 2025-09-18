import { useState } from 'react'
import { X, History, User, ArrowLeft, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import CreatorInfoModal from '../../customers/CreatorInfoModal'
import type { Event } from '../../../../types/types'

interface EventAuditLogModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
}

export default function EventAuditLogModal({ 
  isOpen, 
  onClose, 
  event
}: EventAuditLogModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  if (!isOpen) return null

  const auditLogs = event.logs || []

  const getActionColor = (actionType: string) => {
    switch(actionType) {
      case 'CREATED':
        return 'bg-green-100 text-green-800'
      case 'EDITED':
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
      case 'REMOVED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'STATUS_CHANGED':
        return 'bg-yellow-100 text-yellow-800'
      case 'PARTICIPANT_CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'PARTICIPANT_CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'PARTICIPANT_DECLINED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderFieldChange = (field: string, previousValue: any, newValue: any) => {
    const formatValue = (value: any) => {
      if (value === null || value === undefined) return 'None'
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      if (field === 'eventDate') return format(new Date(value), 'MMM dd, yyyy HH:mm')
      if (field === 'enhancements' && Array.isArray(value)) {
        if (value.length === 0) return 'None'
        return `${value.length} enhancement(s)`
      }
      if (typeof value === 'object') return JSON.stringify(value, null, 2)
      return String(value)
    }

    const getStatusStyle = (status: string) => {
      switch(status) {
        case 'CANCELLED':
          return 'text-red-600 font-medium'
        case 'COMPLETED':
          return 'text-green-600 font-medium'
        case 'IN_PROGRESS':
          return 'text-blue-600 font-medium'
        default:
          return 'text-gray-600'
      }
    }

    return (
      <div className="flex items-start gap-2 text-xs">
        <span className="font-medium text-gray-600 min-w-[100px]">
          {field.replace(/([A-Z])/g, ' $1').trim()}:
        </span>
        <div className="flex items-center gap-2 flex-1">
          {previousValue !== undefined && (
            <>
              {field === 'status' ? (
                <span className={`line-through ${getStatusStyle(previousValue)}`}>
                  {previousValue.replace('_', ' ')}
                </span>
              ) : (
                <span className="text-red-600 line-through">
                  {formatValue(previousValue)}
                </span>
              )}
              <ArrowRight className="h-3 w-3 text-gray-400" />
            </>
          )}
          {field === 'status' ? (
            <span className={getStatusStyle(newValue)}>
              {newValue.replace('_', ' ')}
            </span>
          ) : (
            <span className="text-green-600 font-medium">
              {formatValue(newValue)}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit History - {event.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-900">No audit history found</p>
                <p className="text-sm text-gray-600 mt-1">No changes have been recorded for this event yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="bg-gray-50 rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.actionType)}`}>
                            {log.actionType}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {log.user && (
                            <button
                              onClick={() => setSelectedUserId(log.userId)}
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              <User className="h-3 w-3 mr-1" />
                              {log.user.name}
                            </button>
                          )}
                        </div>
                        
                        {/* Special display for cancellation */}
                        {(log.actionType === 'CANCELLED' || 
                          (log.actionType === 'EDITED' && log.newValues?.status === 'CANCELLED')) && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                            <p className="text-xs font-medium text-red-800">Event Cancelled</p>
                            {log.reason && (
                              <p className="text-xs text-red-700 mt-1">
                                <span className="font-medium">Cancellation Reason:</span> {log.reason}
                              </p>
                            )}
                            {log.cancelledAt && (
                              <p className="text-xs text-red-600 mt-1">
                                Cancelled at: {format(new Date(log.cancelledAt), 'MMM dd, yyyy HH:mm')}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Regular reason display (for non-cancellations) */}
                        {log.reason && !(log.actionType === 'CANCELLED' || 
                          (log.actionType === 'EDITED' && log.newValues?.status === 'CANCELLED')) && (
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

                      {log.changedFields && log.changedFields.length > 0 && (
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {expandedLog === log.id ? 'Hide Details' : 'View Details'}
                        </button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {expandedLog === log.id && log.changedFields && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                        <p className="text-xs font-medium text-gray-700 mb-2">Changed Fields:</p>
                        {log.changedFields.map((field: string) => {
                          const previousValue = log.previousValues?.[field]
                          const newValue = log.newValues?.[field]
                          
                          return (
                            <div key={field}>
                              {renderFieldChange(field, previousValue, newValue)}
                            </div>
                          )
                        })}

                        {/* Enhancement Details */}
                        {(log.changedFields.includes('enhancements')) && (
                          <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                            <p className="text-xs font-medium text-gray-700 mb-2">Enhancement Changes:</p>
                            
                            {log.previousValues?.enhancements && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-600">Previous Enhancements:</p>
                                {Array.isArray(log.previousValues.enhancements) && log.previousValues.enhancements.length > 0 ? (
                                  <ul className="ml-3 mt-1 space-y-1">
                                    {log.previousValues.enhancements.map((e: any, idx: number) => (
                                      <li key={idx} className="text-xs text-gray-500">
                                        • {typeof e === 'string' ? e : `${e.enhancementId} (Price: ${e.overridePrice || 'Default'}, Max: ${e.maxQuantity || 'Unlimited'})`}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-500 ml-3">None</p>
                                )}
                              </div>
                            )}
                            
                            {log.newValues?.enhancements && (
                              <div>
                                <p className="text-xs text-gray-600">New Enhancements:</p>
                                {Array.isArray(log.newValues.enhancements) && log.newValues.enhancements.length > 0 ? (
                                  <ul className="ml-3 mt-1 space-y-1">
                                    {log.newValues.enhancements.map((e: any, idx: number) => (
                                      <li key={idx} className="text-xs text-gray-500">
                                        • {typeof e === 'string' ? e : `${e.enhancementId} (Price: ${e.overridePrice || 'Default'}, Max: ${e.maxQuantity || 'Unlimited'})`}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-500 ml-3">None</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
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
  )
}