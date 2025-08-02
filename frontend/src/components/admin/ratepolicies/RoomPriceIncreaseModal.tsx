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

interface RoomPriceIncreaseModalProps {
  ratePolicy: RatePolicy;
  room: Room;
  date: Date;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RoomPriceIncreaseModal({ 
  ratePolicy, 
  room, 
  date, 
  onClose, 
  onUpdate 
}: RoomPriceIncreaseModalProps) {
  const [increaseAmount, setIncreaseAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const finalPrice = increaseAmount ? room.price + parseFloat(increaseAmount) : room.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!increaseAmount || parseFloat(increaseAmount) <= 0) {
      toast.error("Please enter a valid increase amount");
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
              price: finalPrice,
              priceType: 'ROOM_INCREASE'
            }]
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update room price");
      }

      toast.success("Room price increase applied successfully");
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update room price");
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
            Room Price Increase
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
                Current room price: €{room.price}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="increaseAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Increase Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">+€</span>
              <input
                type="number"
                id="increaseAmount"
                step="0.01"
                min="0"
                value={increaseAmount}
                onChange={(e) => setIncreaseAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This amount will be added to the base room price.
            </p>
          </div>

          {/* Price Preview */}
          {increaseAmount && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <div className="text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>€{room.price}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Increase:</span>
                  <span>+€{parseFloat(increaseAmount).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>Final Price:</span>
                  <span>€{finalPrice.toFixed(2)}</span>
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
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? "Applying..." : "Apply Increase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}