import React, { useState } from "react";
import { format } from "date-fns";
import { RiCloseLine } from "react-icons/ri";
import { toast } from "react-hot-toast";
import { baseUrl } from "../../../utils/constants";
import type { RatePolicy } from "../../../types/types";

interface Room {
  id: string;
  name: string;
  price: number;
}

interface BasePriceOverrideModalProps {
  ratePolicy: RatePolicy;
  room: Room;
  date: Date;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BasePriceOverrideModal({ 
  ratePolicy, 
  room, 
  date, 
  onClose, 
  onUpdate 
}: BasePriceOverrideModalProps) {
  const [basePrice, setBasePrice] = useState<string>(room.price.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!basePrice || parseFloat(basePrice) <= 0) {
      toast.error("Please enter a valid base price");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(
        `${baseUrl}/admin/rate-policies/${ratePolicy.id}/date-prices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            prices: [{
              roomId: room.id,
              date: date.toISOString(),
              price: parseFloat(basePrice),
              priceType: 'BASE_OVERRIDE'
            }]
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update base price");
      }

      toast.success("Base price override applied successfully");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update base price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Base Price Override
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">
              <div><strong>Rate Policy:</strong> {ratePolicy.name}</div>
              <div><strong>Room:</strong> {room.name}</div>
              <div><strong>Date:</strong> {format(date, "EEEE, MMMM dd, yyyy")}</div>
              <div className="mt-2 text-xs text-gray-500">
                Current base price: €{room.price}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-2">
              New Base Price *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">€</span>
              <input
                type="number"
                id="basePrice"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This will override the base price for this specific date and rate policy combination.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Applying..." : "Apply Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}