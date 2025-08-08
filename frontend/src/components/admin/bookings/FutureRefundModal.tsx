import React, { useState } from 'react';
import { X, DollarSign, AlertCircle } from 'lucide-react';

interface FutureRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { sendEmailToCustomer: boolean }) => void;
  paymentIntent: any;
  isLoading?: boolean;
}

const FutureRefundModal: React.FC<FutureRefundModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  paymentIntent,
  isLoading = false
}) => {
  const [sendEmailToCustomer, setSendEmailToCustomer] = useState(true);

  const handleConfirm = () => {
    onConfirm({
      sendEmailToCustomer
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
            Process Future Refund
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Warning Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">
                  Process Delayed Refund
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  This booking was previously cancelled without refund. You can now process the refund payment.
                </p>
              </div>
            </div>
          </div>

          {/* Customer and Payment Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-800">
              <strong>Customer:</strong> {paymentIntent?.customerData?.firstName} {paymentIntent?.customerData?.lastName}
            </p>
            <p className="text-sm text-gray-800">
              <strong>Amount to Refund:</strong> €{paymentIntent?.totalAmount?.toFixed(2)}
            </p>
            <p className="text-sm text-gray-800">
              <strong>Payment Method:</strong> {paymentIntent?.paymentMethod || 'STRIPE'}
            </p>
            <p className="text-sm text-gray-800">
              <strong>Current Status:</strong> <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Cancelled (No Refund)</span>
            </p>
          </div>

          {/* Email Notification Checkbox */}
          <div className="border-t pt-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={sendEmailToCustomer}
                onChange={(e) => setSendEmailToCustomer(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">
                <strong>Send email notification to customer</strong>
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7 mt-1">
              The customer will receive an email confirmation about the refund
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-1" />
                Process Refund
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FutureRefundModal;