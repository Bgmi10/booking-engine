import   { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { type PaymentIntent } from '../../../types/types';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSoftDelete: () => void;
  onHardDelete: () => void;
  paymentIntent: PaymentIntent | null;
  isLoading: boolean;
  isSoftDeleted?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onSoftDelete,
  onHardDelete,
  paymentIntent,
  isLoading,
  isSoftDeleted = false
}: DeleteConfirmationModalProps) {
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>(isSoftDeleted ? 'hard' : 'soft');

  // Update deleteType when modal opens or isSoftDeleted changes
  useEffect(() => {
    if (isOpen) {
      setDeleteType(isSoftDeleted ? 'hard' : 'soft');
    }
  }, [isOpen, isSoftDeleted]);

  if (!isOpen || !paymentIntent) return null;
  
  const handleConfirm = () => {
    if (deleteType === 'soft') {  
      onSoftDelete();
    } else {
      onHardDelete();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Delete Booking</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center text-amber-600 mb-4">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p className="text-sm font-medium">Warning: This action cannot be undone</p>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            You are about to delete booking for{' '}
            <span className="font-medium">
              {paymentIntent.customerData.guestFirstName} {paymentIntent.customerData.guestLastName}
            </span>
          </p>

          {!isSoftDeleted && (
            <div className="space-y-3 mb-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="deleteType"
                  value="soft"
                  checked={deleteType === 'soft'}
                  onChange={() => setDeleteType('soft')}
                  className="mt-1 mr-3"
                  disabled={isLoading}
                />
                <div>
                  <p className="font-medium text-gray-900">Move to Trash</p>
                  <p className="text-sm text-gray-600">
                    Payment intent will be moved to trash and can be restored later
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="deleteType"
                  value="hard"
                  checked={deleteType === 'hard'}
                  onChange={() => setDeleteType('hard')}
                  className="mt-1 mr-3"
                  disabled={isLoading}
                />
                <div>
                  <p className="font-medium text-gray-900">Permanently Delete</p>
                  <p className="text-sm text-red-600">
                    This will permanently remove the payment intent and all associated data
                  </p>
                </div>
              </label>
            </div>
          )}

          {isSoftDeleted && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                This payment intent is already in trash. Deleting it now will permanently remove it
                and all associated data. This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center ${
              deleteType === 'hard' || isSoftDeleted
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isLoading ? 'Deleting...' : deleteType === 'hard' || isSoftDeleted ? 'Delete Permanently' : 'Move to Trash'}
          </button>
        </div>
      </div>
    </div>
  );
}