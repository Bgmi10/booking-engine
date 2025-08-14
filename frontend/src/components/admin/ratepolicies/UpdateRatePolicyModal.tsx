/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { RiCloseLine } from "react-icons/ri";
import { BiLoader } from "react-icons/bi";
import { FaCreditCard, FaPercent, FaCalendarAlt, FaShieldAlt } from "react-icons/fa";
import { baseUrl } from "../../../utils/constants";
import type { RatePolicy } from "../../../types/types";
import toast from "react-hot-toast";

interface UpdateRatePolicyModalProps {
  setIsUpdateModalOpen: (isOpen: boolean) => void;
  setRatePolicies: React.Dispatch<React.SetStateAction<RatePolicy[]>>;
  ratePolicies: RatePolicy[];
  ratePolicy: RatePolicy | null;
}

export default function UpdateRatePolicyModal({
  setIsUpdateModalOpen,
  setRatePolicies,
  ratePolicies,
  ratePolicy,
}: UpdateRatePolicyModalProps) {
  const [name, setName] = useState(ratePolicy?.name || "");
  const [description, setDescription] = useState(ratePolicy?.description || "");
  const [isActive, setIsActive] = useState(ratePolicy?.isActive ?? true);
  const [refundable, setRefundable] = useState(ratePolicy?.refundable ?? true);
  const [prepayPercentage, setPrepayPercentage] = useState(ratePolicy?.prepayPercentage?.toString() || "");
  const [fullPaymentDays, setFullPaymentDays] = useState(ratePolicy?.fullPaymentDays?.toString() || "");
  const [changeAllowedDays, setChangeAllowedDays] = useState(ratePolicy?.changeAllowedDays?.toString() || "");
  const [rebookValidityDays, setRebookValidityDays] = useState(ratePolicy?.rebookValidityDays?.toString() || "");
  const [adjustmentPercentage, setAdjustmentPercentage] = useState((ratePolicy as any)?.adjustmentPercentage?.toString() || "");
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Core business logic fields
  const [paymentStructure, setPaymentStructure] = useState<'FULL_PAYMENT' | 'SPLIT_PAYMENT'>(
    (ratePolicy?.paymentStructure as 'FULL_PAYMENT' | 'SPLIT_PAYMENT') || 'FULL_PAYMENT'
  );
  const [cancellationPolicy, setCancellationPolicy] = useState<'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_REFUNDABLE'>(
    (ratePolicy?.cancellationPolicy as 'FLEXIBLE' | 'MODERATE' | 'STRICT' | 'NON_REFUNDABLE') || 'FLEXIBLE'
  );

  useEffect(() => {
    if (!ratePolicy) {
      setIsUpdateModalOpen(false);
    }
  }, [ratePolicy, setIsUpdateModalOpen]);

  if (!ratePolicy) {
    return null;
  }

  const updateRatePolicy = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Rate policy name is required");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setLoadingAction(true);

    const policyData = {
        name,
        description,
        isActive,
        refundable,
        prepayPercentage: prepayPercentage ? Number(prepayPercentage) : undefined,
        fullPaymentDays: fullPaymentDays ? Number(fullPaymentDays) : undefined,
        changeAllowedDays: changeAllowedDays ? Number(changeAllowedDays) : undefined,
        rebookValidityDays: rebookValidityDays ? Number(rebookValidityDays) : undefined,
        adjustmentPercentage: adjustmentPercentage ? Number(adjustmentPercentage) : undefined,
        paymentStructure,
        cancellationPolicy,
    }

    try {
      const response = await fetch(`${baseUrl}/admin/rate-policies/${ratePolicy.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(policyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update rate policy");
      }

      toast.success("Rate policy updated successfully!");
      setRatePolicies(
        ratePolicies.map((policy) =>
          policy.id === ratePolicy.id ? { ...policy, ...data.data } : policy
        )
      );

      setIsUpdateModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update rate policy. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={() => setIsUpdateModalOpen(false)}
    >
      <div
        className="bg-white/90 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[85vh] relative animate-fade-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200/80 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Update Rate Policy</h2>
            <p className="text-sm text-gray-500">Edit flexible payment and cancellation options</p>
          </div>
          <button
            onClick={() => setIsUpdateModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={loadingAction}
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Standard Rate"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Detailed description of the rate policy"
              />
            </div>


            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="prepayPercentage" className="block text-sm font-medium text-gray-700">
                  Prepayment Percentage
                </label>
                <input
                  type="number"
                  id="prepayPercentage"
                  value={prepayPercentage}
                  onChange={(e) => setPrepayPercentage(e.target.value)}
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="50"
                />
              </div>

              <div>
                <label htmlFor="fullPaymentDays" className="block text-sm font-medium text-gray-700">
                  Full Payment Days Before
                </label>
                <input
                  type="number"
                  id="fullPaymentDays"
                  value={fullPaymentDays}
                  onChange={(e) => setFullPaymentDays(e.target.value)}
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="changeAllowedDays" className="block text-sm font-medium text-gray-700">
                  Changes Allowed Days Before
                </label>
                <input
                  type="number"
                  id="changeAllowedDays"
                  value={changeAllowedDays}
                  onChange={(e) => setChangeAllowedDays(e.target.value)}
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="7"
                />
              </div>

              <div>
                <label htmlFor="rebookValidityDays" className="block text-sm font-medium text-gray-700">
                  Rebook Validity Days
                </label>
                <input
                  type="number"
                  id="rebookValidityDays"
                  value={rebookValidityDays}
                  onChange={(e) => setRebookValidityDays(e.target.value)}
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="365"
                />
              </div>
            </div>

            {/* Price Adjustment Section */}
            <div>
              <label htmlFor="adjustmentPercentage" className="block text-sm font-medium text-gray-700">
                Price Adjustment Percentage
              </label>
              <div className="mt-1 relative">
                <input
                  type="number"
                  id="adjustmentPercentage"
                  value={adjustmentPercentage}
                  onChange={(e) => setAdjustmentPercentage(e.target.value)}
                  min="-100"
                  max="100"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-8"
                  placeholder="0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Positive values increase room prices, negative values decrease them (e.g., +30 for 30% markup, -20 for 20% discount)
              </p>
            </div>

            {/* Payment Structure Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Structure
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setPaymentStructure('FULL_PAYMENT')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentStructure === 'FULL_PAYMENT'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                  }`}
                >
                  <FaCreditCard className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <h4 className="text-lg font-semibold text-center text-gray-900">Full Payment</h4>
                  <p className="text-sm text-gray-600 text-center">100% payment upfront</p>
                </div>
                <div
                  onClick={() => setPaymentStructure('SPLIT_PAYMENT')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentStructure === 'SPLIT_PAYMENT'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                  }`}
                >
                  <FaPercent className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <h4 className="text-lg font-semibold text-center text-gray-900">Split Payment</h4>
                  <p className="text-sm text-gray-600 text-center">30% now, 70% on check-in</p>
                </div>
              </div>
            </div>

            {/* Cancellation Policy Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cancellation Policy
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div
                  onClick={() => setCancellationPolicy('FLEXIBLE')}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    cancellationPolicy === 'FLEXIBLE'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-400'
                  }`}
                >
                  <FaShieldAlt className="w-6 h-6 mx-auto text-green-600 mb-1" />
                  <h5 className="text-sm font-semibold text-center text-gray-900">Flexible</h5>
                  <p className="text-xs text-gray-600 text-center">Cancel anytime</p>
                </div>
                <div
                  onClick={() => setCancellationPolicy('MODERATE')}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    cancellationPolicy === 'MODERATE'
                      ? 'border-yellow-600 bg-yellow-50'
                      : 'border-gray-200 bg-white hover:border-yellow-400'
                  }`}
                >
                  <FaCalendarAlt className="w-6 h-6 mx-auto text-yellow-600 mb-1" />
                  <h5 className="text-sm font-semibold text-center text-gray-900">Moderate</h5>
                  <p className="text-xs text-gray-600 text-center">Cancel 30 days before</p>
                </div>
                <div
                  onClick={() => setCancellationPolicy('STRICT')}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    cancellationPolicy === 'STRICT'
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-orange-400'
                  }`}
                >
                  <FaCalendarAlt className="w-6 h-6 mx-auto text-orange-600 mb-1" />
                  <h5 className="text-sm font-semibold text-center text-gray-900">Strict</h5>
                  <p className="text-xs text-gray-600 text-center">Changes only, no cancel</p>
                </div>
                <div
                  onClick={() => setCancellationPolicy('NON_REFUNDABLE')}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    cancellationPolicy === 'NON_REFUNDABLE'
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-red-400'
                  }`}
                >
                  <FaShieldAlt className="w-6 h-6 mx-auto text-red-600 mb-1" />
                  <h5 className="text-sm font-semibold text-center text-gray-900">Non-Refundable</h5>
                  <p className="text-xs text-gray-600 text-center">No cancel, no change</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="refundable"
                  type="checkbox"
                  checked={refundable}
                  onChange={(e) => setRefundable(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="refundable" className="ml-2 block text-sm text-gray-900">
                  Refundable
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50/80 border-t border-gray-200/80 flex justify-between items-center">
          <button
            onClick={() => setIsUpdateModalOpen(false)}
            disabled={loadingAction}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={updateRatePolicy}
            disabled={loadingAction}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingAction ? (
              <>
                <BiLoader className="animate-spin" />
                Updating...
              </>
            ) : (
              "Update Rate Policy"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}