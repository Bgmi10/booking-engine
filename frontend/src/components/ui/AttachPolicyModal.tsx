import { RiCloseLine } from "react-icons/ri";

import type { RatePolicy } from "../../types/types";
import RatePolicyTab from "./RatePolicyTab";

export const AttachPoliciesModal = ({
    setIsAttachPoliciesModalOpen,
    ratepolicies,
    isDiscountTab,
    setIsDiscountTab,
    selectedPolicies,
    togglePolicySelection
  }: {
    setIsAttachPoliciesModalOpen: (isOpen: boolean) => void
    ratepolicies: {
      fullPaymentPolicy: RatePolicy[];
      splitPaymentPolicy: RatePolicy[];
    }
    isDiscountTab: boolean
    setIsDiscountTab: (isDiscountTab: boolean) => void
    selectedPolicies?: RatePolicy[]
    togglePolicySelection: (policy: RatePolicy) => void
  }) => {
    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh]">
          <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white z-10">
            <h3 className="text-xl font-semibold text-gray-900">Attach Policies</h3>
            <button 
              onClick={() => setIsAttachPoliciesModalOpen(false)} 
              className="text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
          <div>
            <RatePolicyTab isDiscountTab={isDiscountTab} setIsDiscountTab={setIsDiscountTab} />
          </div>
          {isDiscountTab ? (
            <div>
              {ratepolicies?.splitPaymentPolicy?.map((policy) => (
                <div key={policy.id} className="flex items-center gap-4 p-3 border-b">
                  <input 
                    type="checkbox" 
                    checked={selectedPolicies?.some(p => p.id === policy.id)}
                    onChange={() => togglePolicySelection(policy)}
                    className="cursor-pointer" 
                  />
                  <div className="flex-1">
                    <h2 className="font-medium">{policy.name}</h2>
                    <p className="text-sm text-gray-500 line-clamp-1 w-20">{policy.description}</p>
                    <p className="text-sm text-gray-500">Split Payment Available</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {ratepolicies?.fullPaymentPolicy?.map((policy) => (
                <div key={policy.id} className="flex items-center gap-4 p-3 border-b">
                  <input 
                    type="checkbox" 
                    checked={selectedPolicies?.some(p => p.id === policy.id)}
                    onChange={() => togglePolicySelection(policy)}
                    className="cursor-pointer" 
                  />
                  <div className="flex-1">
                    <h2 className="font-medium">{policy.name}</h2>
                    <p className="text-sm text-gray-500 line-clamp-1">{policy.description}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {(policy as any)?.paymentStructure === 'SPLIT_PAYMENT' ? 'Split Payment' : 'Full Payment'}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {policy.refundable ? "Refundable" : "Non-refundable"}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {policy.rebookValidityDays} days rebooking
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {policy.fullPaymentDays} days full payment
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 border-t sticky bottom-0 bg-white">
            <button
              onClick={() => setIsAttachPoliciesModalOpen(false)}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }