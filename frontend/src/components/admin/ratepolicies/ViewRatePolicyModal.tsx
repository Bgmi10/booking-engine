import { RiCloseLine } from "react-icons/ri";
import { FaCreditCard, FaPercent, FaCalendarAlt, FaShieldAlt, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import type { RatePolicy } from "../../../types/types";

interface ViewRatePolicyModalProps {
  setIsViewModalOpen: (isOpen: boolean) => void;
  ratePolicy: RatePolicy | null;
}

export default function ViewRatePolicyModal({
  setIsViewModalOpen,
  ratePolicy,
}: ViewRatePolicyModalProps) {
  if (!ratePolicy) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={() => setIsViewModalOpen(false)}
    >
      <div
        className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[85vh] relative animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200/80 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Rate Policy Details</h2>
            <p className="text-sm text-gray-500">View policy configuration and settings</p>
          </div>
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto">
          <div className="space-y-6">
            
            {/* Basic Information Card */}
            <div className="bg-white/70 rounded-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Name</h4>
                  <p className="text-lg font-medium text-gray-900">{ratePolicy.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <div className="flex items-center gap-2">
                    {ratePolicy.isActive ? (
                      <FaCheckCircle className="text-green-500" />
                    ) : (
                      <FaTimesCircle className="text-red-500" />
                    )}
                    <span className="text-sm font-medium">
                      {ratePolicy.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {ratePolicy.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Structure Card */}
            <div className="bg-white/70 rounded-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50">
                  {(ratePolicy as any).paymentStructure === 'SPLIT_PAYMENT' ? (
                    <FaPercent className="w-8 h-8 text-blue-600 mb-2" />
                  ) : (
                    <FaCreditCard className="w-8 h-8 text-blue-600 mb-2" />
                  )}
                  <h4 className="text-lg font-semibold text-gray-900">
                    {(ratePolicy as any).paymentStructure === 'SPLIT_PAYMENT' ? 'Split Payment' : 'Full Payment'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {(ratePolicy as any).paymentStructure === 'SPLIT_PAYMENT' 
                      ? '30% now, 70% on check-in' 
                      : '100% payment upfront'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Rate</h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {ratePolicy?.nightlyRate ? "€" : ""}{ratePolicy?.nightlyRate ? ratePolicy?.nightlyRate : ratePolicy?.discountPercentage} {ratePolicy?.discountPercentage ? "%" : ""}
                  </p>
                  <p className="text-sm text-gray-500">
                    {ratePolicy?.discountPercentage ? "Discount" : "Per night"}
                  </p>
                </div>
              </div>
            </div>

            {/* Cancellation Policy Card */}
            <div className="bg-white/70 rounded-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Cancellation Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { key: 'FLEXIBLE', label: 'Flexible', desc: 'Cancel anytime', color: 'green', icon: FaShieldAlt },
                  { key: 'MODERATE', label: 'Moderate', desc: 'Cancel 30 days before', color: 'yellow', icon: FaCalendarAlt },
                  { key: 'STRICT', label: 'Strict', desc: 'Changes only, no cancel', color: 'orange', icon: FaCalendarAlt },
                  { key: 'NON_REFUNDABLE', label: 'Non-Refundable', desc: 'No cancel, no change', color: 'red', icon: FaShieldAlt }
                ].map((policy) => {
                  const isActive = (ratePolicy as any).cancellationPolicy === policy.key;
                  const IconComponent = policy.icon;
                  return (
                    <div
                      key={policy.key}
                      className={`p-3 rounded-lg border-2 ${
                        isActive
                          ? `border-${policy.color}-500 bg-${policy.color}-50`
                          : 'border-gray-200 bg-gray-50 opacity-50'
                      }`}
                    >
                      <IconComponent className={`w-6 h-6 mx-auto mb-1 ${
                        isActive ? `text-${policy.color}-600` : 'text-gray-400'
                      }`} />
                      <h5 className={`text-sm font-semibold text-center ${
                        isActive ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {policy.label}
                      </h5>
                      <p className={`text-xs text-center ${
                        isActive ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {policy.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Policy Details Card */}
            {(ratePolicy?.prepayPercentage !== undefined || ratePolicy?.fullPaymentDays !== undefined || ratePolicy?.changeAllowedDays !== undefined || ratePolicy?.rebookValidityDays !== undefined) && (
              <div className="bg-white/70 rounded-xl p-6 border border-gray-200/50">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Policy Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ratePolicy?.prepayPercentage !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Prepayment Percentage</h4>
                      <p className="text-lg font-medium text-gray-900">{ratePolicy?.prepayPercentage}%</p>
                    </div>
                  )}

                  {ratePolicy?.fullPaymentDays !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Full Payment Required</h4>
                      <p className="text-lg font-medium text-gray-900">
                        {ratePolicy?.fullPaymentDays} days before check-in
                      </p>
                    </div>
                  )}

                  {ratePolicy?.changeAllowedDays !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Changes Allowed Until</h4>
                      <p className="text-lg font-medium text-gray-900">
                        {ratePolicy?.changeAllowedDays} days before check-in
                      </p>
                    </div>
                  )}

                  {ratePolicy?.rebookValidityDays !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Rebook Validity</h4>
                      <p className="text-lg font-medium text-gray-900">
                        {ratePolicy?.rebookValidityDays} days
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Information Card */}
            <div className="bg-white/70 rounded-xl p-6 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Created At</h4>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDate(ratePolicy.createdAt)}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h4>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDate(ratePolicy.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50/80 border-t border-gray-200/80 flex justify-end">
          <button
            type="button"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none transition-colors"
            onClick={() => setIsViewModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 