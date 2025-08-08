import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

interface RefundConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { reason: string; sendEmailToCustomer: boolean; processRefund: boolean }) => void;
  paymentIntent: any;
  isLoading?: boolean;
}

const RefundConfirmationModal: React.FC<RefundConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm, 
  paymentIntent,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [sendEmailToCustomer, setSendEmailToCustomer] = useState(true);
  const [selectedReason, setSelectedReason] = useState('requested_by_customer');
  const [processRefund, setProcessRefund] = useState(true);

  const allowedReasons = [
    { value: 'requested_by_customer', label: 'Requested by customer' },
    { value: 'duplicate', label: 'Duplicate payment' },
    { value: 'fraudulent', label: 'Fraudulent payment' }
  ];

  const isStripePayment = paymentIntent?.paymentMethod === 'STRIPE' || 
                          paymentIntent?.stripePaymentLinkId || 
                          paymentIntent?.stripeSessionId;

  const handleConfirm = () => {
    const finalReason = isStripePayment 
      ? selectedReason
      : reason || '';
    
    onConfirm({
      reason: finalReason,
      sendEmailToCustomer,
      processRefund
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-orange-600" />
            {processRefund ? 'Confirm Refund' : 'Confirm Cancellation'}
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
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Customer:</strong> {paymentIntent?.customerData?.firstName} {paymentIntent?.customerData?.lastName}
            </p>
            <p className="text-sm text-orange-800">
              <strong>Amount:</strong> €{paymentIntent?.amount?.toFixed(2)}
            </p>
            <p className="text-sm text-orange-800">
              <strong>Payment Method:</strong> {paymentIntent?.paymentMethod || 'STRIPE'}
            </p>
          </div>

          {/* Refund Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refund Reason {isStripePayment && '*'}
            </label>
            
            {isStripePayment ? (
              <div className="space-y-2">
                {allowedReasons.map((reasonOption) => (
                  <label key={reasonOption.value} className="flex items-center">
                    <input
                      type="radio"
                      name="refundReason"
                      value={reasonOption.value}
                      checked={selectedReason === reasonOption.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-700">{reasonOption.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter refund reason or note (optional)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                rows={3}
                disabled={isLoading}
              />
            )}
          </div>

          {/* Process Refund Checkbox */}
          <div className="border-t pt-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={processRefund}
                onChange={(e) => setProcessRefund(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">
                <strong>Process refund payment</strong>
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7 mt-1">
              {processRefund ? 'Money will be refunded to the customer' : 'Only cancel the booking without processing refund'}
            </p>
          </div>

          {/* Email Notification Checkbox */}
          <div className="pt-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={sendEmailToCustomer}
                onChange={(e) => setSendEmailToCustomer(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">
                <strong>Send email notification to customer</strong>
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7 mt-1">
              The customer will receive an email confirmation about the {processRefund ? 'refund' : 'cancellation'}
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
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
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
                {processRefund ? 'Confirm Refund' : 'Confirm Cancellation'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundConfirmationModal;