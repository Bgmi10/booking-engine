import { X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title?: string;
  itemName?: string;
  message?: string;
  confirmButtonText?: string;
  isLoading?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  itemName,
  message,
  confirmButtonText = "Delete",
  isLoading = false,
  requireReason = false,
  reasonLabel = "Reason for deletion",
  reasonPlaceholder = "Please provide a reason for this deletion..."
}: DeleteConfirmationModalProps) {
  const [reason, setReason] = useState('');
  
  if (!isOpen) return null;

  const defaultMessage = itemName 
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : "Are you sure you want to delete this item? This action cannot be undone.";

  const handleConfirm = () => {
    onConfirm(requireReason ? reason : undefined);
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const isConfirmDisabled = isLoading || (requireReason && !reason.trim());

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-center mb-4 text-red-500">
              <AlertTriangle size={48} />
            </div>
            <p className="text-sm text-gray-600 text-center">
              {message || defaultMessage}
            </p>
          </div>
          
          {requireReason && (
            <div className="mt-4">
              <label htmlFor="deletion-reason" className="block text-sm font-medium text-gray-700 mb-2">
                {reasonLabel}
              </label>
              <textarea
                id="deletion-reason"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
              />
              {requireReason && !reason.trim() && (
                <p className="mt-1 text-xs text-red-600">Reason is required</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none disabled:opacity-50"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </span>
            ) : (
              confirmButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}