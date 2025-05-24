import { RiCloseLine } from "react-icons/ri";
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
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">View Rate Policy</h3>
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Name</h4>
              <p className="mt-1 text-sm text-gray-900">{ratePolicy.name}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Description</h4>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {ratePolicy.description}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Nightly Rate</h4>
              <p className="mt-1 text-sm text-gray-900">{ratePolicy?.nightlyRate ? "€" : ""}{ratePolicy?.nightlyRate ? ratePolicy?.nightlyRate : ratePolicy?.discountPercentage} {ratePolicy?.discountPercentage ? "%" : ""}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <span
                  className={`mt-1 inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                    ratePolicy.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {ratePolicy.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Type</h4>
                <span
                  className={`mt-1 inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                    ratePolicy?.refundable
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  { ratePolicy?.refundable ? "Refundable" : ratePolicy?.discountPercentage ? "Discount" : "Non-refundable"}
                </span>
              </div>
            </div>

            {ratePolicy?.prepayPercentage !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Prepayment Percentage</h4>
                <p className="mt-1 text-sm text-gray-900">{ratePolicy?.prepayPercentage}%</p>
              </div>
            )}

            {ratePolicy?.fullPaymentDays !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Full Payment Required</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {ratePolicy?.fullPaymentDays} days before check-in
                </p>
              </div>
            )}

            {ratePolicy?.changeAllowedDays !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Changes Allowed Until</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {ratePolicy?.changeAllowedDays} days before check-in
                </p>
              </div>
            )}

            {ratePolicy?.rebookValidityDays !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Rebook Validity</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {ratePolicy?.rebookValidityDays} days
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Created At</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(ratePolicy.createdAt)}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">Last Updated</h4>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(ratePolicy.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end rounded-b-lg sticky bottom-0">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsViewModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 