import React from "react";

interface TotalAmountSummaryProps {
  totalAmount: number;
  taxAmount: number;
  taxPercentage: number;
}

const TotalAmountSummary: React.FC<TotalAmountSummaryProps> = ({ totalAmount, taxAmount, taxPercentage }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
        <span>Subtotal:</span>
        <span>€{(totalAmount - taxAmount).toFixed(2)}</span>
      </div>
      <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
        <span>Tax ({Math.round(taxPercentage * 100)}% IVA) included in price:</span>
        <span>€{taxAmount.toFixed(2)}</span>
      </div>
      <div className="flex justify-between items-center text-lg font-semibold text-gray-900 border-t pt-2">
        <span>Total:</span>
        <span>€{totalAmount.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default TotalAmountSummary; 