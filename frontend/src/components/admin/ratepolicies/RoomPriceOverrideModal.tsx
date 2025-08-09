/* eslint-disable @typescript-eslint/no-explicit-any */
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

interface RoomPriceOverrideModalProps {
  ratePolicy: RatePolicy;
  room: Room;
  date: Date;
  calculatedPrice: number;
  onClose: () => void;
  onUpdate: () => void;
  onSwitchModal: (type: 'base' | 'increase' | 'override') => void;
}

export default function RoomPriceOverrideModal({ 
  ratePolicy, 
  room, 
  date, 
  calculatedPrice,
  onClose, 
  onUpdate,
}: RoomPriceOverrideModalProps) {
  const [overridePrice, setOverridePrice] = useState<string>(calculatedPrice.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!overridePrice || parseFloat(overridePrice) <= 0) {
      toast.error("Please enter a valid override price");
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
              price: parseFloat(overridePrice),
              priceType: 'ROOM_OVERRIDE'
            }]
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update room price");
      }

      toast.success("Room price override applied successfully");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update room price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Room Price Override
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
                Current calculated price: €{calculatedPrice.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="overridePrice" className="block text-sm font-medium text-gray-700 mb-2">
              Override Price *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">€</span>
              <input
                type="number"
                id="overridePrice"
                step="0.01"
                min="0"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This will completely override the room price for this specific date and rate policy.
            </p>
          </div>

          {/* Price Comparison */}
          {overridePrice && parseFloat(overridePrice) !== calculatedPrice && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <div className="text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Current Calculated Price:</span>
                  <span>€{calculatedPrice.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between ${
                  parseFloat(overridePrice) > calculatedPrice ? 'text-red-600' : 'text-green-600'
                }`}>
                  <span>Override Price:</span>
                  <span>€{parseFloat(overridePrice).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>Difference:</span>
                  <span className={
                    parseFloat(overridePrice) > calculatedPrice ? 'text-red-600' : 'text-green-600'
                  }>
                    {parseFloat(overridePrice) > calculatedPrice ? '+' : ''}
                    €{(parseFloat(overridePrice) - calculatedPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

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