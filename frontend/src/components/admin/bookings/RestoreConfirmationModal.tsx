import { RefreshCw, X } from 'lucide-react';
import { type PaymentIntent } from '../../../types/types';

interface RestoreConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
  paymentIntent: PaymentIntent | null;
  isLoading: boolean;
}

export default function RestoreConfirmationModal({
  isOpen,
  onClose,
  onRestore,
  paymentIntent,
  isLoading
}: RestoreConfirmationModalProps) {
  if (!isOpen || !paymentIntent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Restore Booking</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 text-sm mb-4">
            Are you sure you want to restore this booking for{' '}
            <span className="font-medium">
              {paymentIntent.customerData.guestFirstName} {paymentIntent.customerData.guestLastName}
            </span>?
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This booking will be moved back to the active bookings list and will be available for viewing and management.
            </p>
          </div>
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
            onClick={onRestore}
            disabled={isLoading}
            className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isLoading ? 'Restoring...' : 'Restore Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}