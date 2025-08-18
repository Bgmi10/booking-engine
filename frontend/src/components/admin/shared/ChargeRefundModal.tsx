import { X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { baseUrl } from "../../../utils/constants";
import type { Charge, PaymentRecord } from "../../../types/types";

interface ChargeRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  charge: Charge | null | PaymentRecord | any;
  onRefundSuccess: () => void;
}

export default function ChargeRefundModal({ isOpen, onClose, charge, onRefundSuccess }: ChargeRefundModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  if (!isOpen || !charge) return null;

  const handleRefund = async () => {

    setIsProcessing(true);
    try {
      let refundUrl = `${baseUrl}/admin/charges/${charge.id}/refund`;
      if (charge.paymentMethod?.toLowerCase() === 'cash') {
        refundUrl += '?paymentMethod=cash';
      }

      const response = await fetch(refundUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refundReason: refundReason.trim() || "Refund requested"
        })
      });

      if (response.ok) {
        onRefundSuccess();
        setRefundReason(""); // Reset form
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({ message: "Failed to refund payment." }));
        alert(errorData.message || "Failed to refund payment.");
      }
    } catch (error) {
      console.error("Error refunding payment:", error);
      alert("An error occurred while processing the refund.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Refund Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Confirm Refund</h3>
              <p className="text-sm text-gray-600">This action cannot be undone.</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{charge.currency?.toUpperCase() || 'EUR'} {charge.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-medium">{charge.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Description:</span>
                <span className="font-medium">{charge.description || 'No description'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {new Date(charge.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="refundReason" className="block text-sm font-medium text-gray-700 mb-2">
              Refund Reason (Optional)
            </label>
            <textarea
              id="refundReason"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Enter reason for refund..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleRefund}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Refund Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}