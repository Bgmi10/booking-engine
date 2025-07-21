import { RiCloseLine } from "react-icons/ri";

import type { RatePolicy } from "../../types/types";

export const AttachPoliciesModal = ({
    setIsAttachPoliciesModalOpen,
    ratepolicies,
    selectedPolicies,
    togglePolicySelection
  }: {
    setIsAttachPoliciesModalOpen: (isOpen: boolean) => void
    ratepolicies: {
      fullPaymentPolicy: RatePolicy[];
      splitPaymentPolicy: RatePolicy[];
    }
    selectedPolicies?: RatePolicy[]
    togglePolicySelection: (policy: RatePolicy) => void
  }) => {
    return (
      <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white z-10">
            <h3 className="text-xl font-semibold text-gray-900">Attach Policies</h3>
            <button 
              onClick={() => setIsAttachPoliciesModalOpen(false)} 
              className="text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
          
          <div className="p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Available Rate Policies</h4>
            <div className="space-y-2">
              {/* Full Payment Policies */}
              {ratepolicies?.fullPaymentPolicy?.map((policy) => (
                <div key={policy.id} className="flex items-center gap-4 p-3 border rounded-md">
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
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Full Payment
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {policy.refundable ? "Refundable" : "Non-refundable"}
                      </span>
                      {(policy as any).cancellationPolicy && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {(policy as any).cancellationPolicy.replace('_', ' ').toLowerCase()}
                        </span>
                      )}
                      {policy.rebookValidityDays && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {policy.rebookValidityDays} days rebooking
                        </span>
                      )}
                      {policy.fullPaymentDays && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {policy.fullPaymentDays} days full payment
                        </span>
                      )}
                      {(policy as any).adjustmentPercentage !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          (policy as any).adjustmentPercentage >= 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {(policy as any).adjustmentPercentage >= 0 ? '+' : ''}{(policy as any).adjustmentPercentage}% price
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Split Payment Policies */}
              {ratepolicies?.splitPaymentPolicy?.map((policy) => (
                <div key={policy.id} className="flex items-center gap-4 p-3 border rounded-md">
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
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Split Payment {policy.prepayPercentage ? `(${policy.prepayPercentage}% + ${100 - policy.prepayPercentage}%)` : '(30% + 70%)'}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {policy.refundable ? "Refundable" : "Non-refundable"}
                      </span>
                      {(policy as any).cancellationPolicy && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {(policy as any).cancellationPolicy.replace('_', ' ').toLowerCase()}
                        </span>
                      )}
                      {policy.rebookValidityDays && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {policy.rebookValidityDays} days rebooking
                        </span>
                      )}
                      {policy.fullPaymentDays && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          Final payment {policy.fullPaymentDays} days before
                        </span>
                      )}
                      {(policy as any).adjustmentPercentage !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          (policy as any).adjustmentPercentage >= 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {(policy as any).adjustmentPercentage >= 0 ? '+' : ''}{(policy as any).adjustmentPercentage}% price
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
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