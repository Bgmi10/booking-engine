/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { RiCloseLine, RiCheckLine, RiErrorWarningLine } from "react-icons/ri";
import { BiLoader } from "react-icons/bi";
import { baseUrl } from "../../../utils/constants";
import type { RatePolicy } from "../../../types/types";

interface UpdateRatePolicyModalProps {
  setIsUpdateModalOpen: (isOpen: boolean) => void;
  setRatePolicies: React.Dispatch<React.SetStateAction<RatePolicy[]>>;
  ratePolicies: RatePolicy[];
  setError: (error: string) => void;
  setSuccess: (success: string) => void;
  ratePolicy: RatePolicy | null;
}

export default function UpdateRatePolicyModal({
  setIsUpdateModalOpen,
  setRatePolicies,
  ratePolicies,
  setError,
  setSuccess,
  ratePolicy,
}: UpdateRatePolicyModalProps) {
  const [name, setName] = useState(ratePolicy?.name || "");
  const [description, setDescription] = useState(ratePolicy?.description || "");
  const [nightlyRate, setNightlyRate] = useState(ratePolicy?.nightlyRate?.toString() || "");
  const [isActive, setIsActive] = useState(ratePolicy?.isActive ?? true);
  const [refundable, setRefundable] = useState(ratePolicy?.refundable ?? true);
  const [prepayPercentage, setPrepayPercentage] = useState(ratePolicy?.prepayPercentage?.toString() || "");
  const [fullPaymentDays, setFullPaymentDays] = useState(ratePolicy?.fullPaymentDays?.toString() || "");
  const [changeAllowedDays, setChangeAllowedDays] = useState(ratePolicy?.changeAllowedDays?.toString() || "");
  const [rebookValidityDays, setRebookValidityDays] = useState(ratePolicy?.rebookValidityDays?.toString() || "");
  const [loadingAction, setLoadingAction] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(ratePolicy?.discountPercentage?.toString() || "");
  const [localError, setLocalError] = useState("");
  const [localSuccess, setLocalSuccess] = useState("");

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
      setLocalError("Rate policy name is required");
      return;
    }

    if (!description.trim()) {
      setLocalError("Description is required");
      return;
    }
    if (discountPercentage) {
      if (!discountPercentage || isNaN(Number(discountPercentage)) || Number(discountPercentage) <= 0) {
        setLocalError("Please enter a valid discount percentage");
        return;
      }
    } else {
      if (!nightlyRate.trim() || isNaN(Number(nightlyRate)) || Number(nightlyRate) <= 0) {
        setLocalError("Please enter a valid nightly rate");
        return;
      }
    }

    setLoadingAction(true);
    setLocalError("");
    setLocalSuccess("");

    const singleRatePolicy = {
        name,
        description,
        nightlyRate: Number(nightlyRate),
        isActive,
        refundable,
        prepayPercentage: prepayPercentage ? Number(prepayPercentage) : undefined,
        discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
        fullPaymentDays: fullPaymentDays ? Number(fullPaymentDays) : undefined,
        changeAllowedDays: changeAllowedDays ? Number(changeAllowedDays) : undefined,
        rebookValidityDays: rebookValidityDays ? Number(rebookValidityDays) : undefined,
    }

    const discountRatePolicy = {
      name,
      description,
      discountPercentage: Number(discountPercentage),
      isActive,
      refundable,
    }


    try {
      const response = await fetch(`${baseUrl}/admin/rate-policies/${ratePolicy.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(discountPercentage ? discountRatePolicy : singleRatePolicy),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update rate policy");
      }

      setLocalSuccess("Rate policy updated successfully!");
      setSuccess("Rate policy updated successfully!");

      // Update ratePolicies state with the updated policy
      setRatePolicies(
        ratePolicies.map((policy) =>
          policy.id === ratePolicy.id ? { ...policy, ...data.data } : policy
        )
      );

      // Close modal after success
      setTimeout(() => {
        setIsUpdateModalOpen(false);
      }, 2000);
    } catch (error: any) {
      console.error(error);
      setLocalError(error.message || "Failed to update rate policy. Please try again.");
      setError(error.message || "Failed to update rate policy. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white">
          <h3 className="text-xl font-semibold text-gray-900">Update Rate Policy</h3>
          <button
            onClick={() => setIsUpdateModalOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={loadingAction}
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <div className="p-6">
          {localError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiErrorWarningLine className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{localError}</p>
                </div>
              </div>
            </div>
          )}

          {localSuccess && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <RiCheckLine className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{localSuccess}</p>
                </div>
              </div>
            </div>
          )}

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

            <div>
              { nightlyRate !== "0" ? (<><label htmlFor="nightlyRate" className="block text-sm font-medium text-gray-700">
                Nightly Rate (EUR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="nightlyRate"
                value={nightlyRate}
                onChange={(e) => setNightlyRate(e.target.value)}
                min="0"
                step="0.01"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="99.99"
              />
              </>
              ) : (
                <>
                <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700">
                  Discount Percentage <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="discountPercentage"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="50"
                />
                </>
              )}
            </div>

           { prepayPercentage && <div className="grid grid-cols-2 gap-4">
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
            </div>}

            { changeAllowedDays && <div className="grid grid-cols-2 gap-4">
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
            </div>}

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

             {refundable && <div className="flex items-center">
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
              </div>}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-end space-x-3 rounded-b-lg sticky bottom-0">
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
            onClick={() => setIsUpdateModalOpen(false)}
            disabled={loadingAction}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            onClick={updateRatePolicy}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <span className="flex items-center">
                <BiLoader className="animate-spin mr-2" />
                Updating...
              </span>
            ) : (
              "Update Rate Policy"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}