/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { format } from "date-fns";
import { RiCloseLine } from "react-icons/ri";
import { toast } from "react-hot-toast";
import { baseUrl } from "../../../utils/constants";
import type { RatePolicy, Room } from "../../../types/types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface BulkOverrideModalProps {
  ratePolicy: RatePolicy;
  rooms: Room[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function BulkOverrideModal({
  ratePolicy,
  rooms,
  onClose,
  onUpdate,
}: BulkOverrideModalProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 6]); // Default to weekends (Sunday=0, Saturday=6)
  const [overridePrice, setOverridePrice] = useState<string>("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>(rooms.map(r => r.id));
  const [priceType, setPriceType] = useState<'BASE_OVERRIDE' | 'ROOM_OVERRIDE'>('ROOM_OVERRIDE');
  const [loading, setLoading] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'BULK_OVERRIDE' | 'BULK_INCREASE' | 'BULK_DECREASE' | ''>("");
  //@ts-ignore
  const [currentPrices, setCurrentPrices] = useState<{[key: string]: number}>({});
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get current/base prices for comparison
  const getCurrentPrices = (targetDates: Date[], roomIds: string[]) => {
    const pricesMap: {[key: string]: number} = {};
    
    // For now, use base room prices as current prices
    // In the future, you can enhance this to fetch existing overrides
    roomIds.forEach(roomId => {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        targetDates.forEach(date => {
          const key = `${roomId}-${date.toISOString()}`;
          pricesMap[key] = room.price;
        });
      }
    });
    
    setCurrentPrices(pricesMap);
    return pricesMap;
  };

  // Calculate bulk action type based on current vs new prices
  const calculateActionType = (targetDates: Date[], roomIds: string[], newPrice: number, currentPricesMap: any) => {
    let increaseCount = 0;
    let decreaseCount = 0;
    let sameCount = 0;
    
    roomIds.forEach(roomId => {
      targetDates.forEach(date => {
        const key = `${roomId}-${date.toISOString()}`;
        const currentPrice = currentPricesMap[key];
        
        if (currentPrice !== undefined) {
          if (newPrice > currentPrice) {
            increaseCount++;
          } else if (newPrice < currentPrice) {
            decreaseCount++;
          } else {
            sameCount++;
          }
        }
      });
    });

    if (increaseCount > decreaseCount && increaseCount > sameCount) {
      return 'BULK_INCREASE';
    } else if (decreaseCount > increaseCount && decreaseCount > sameCount) {
      return 'BULK_DECREASE';
    } else {
      // Mixed or same prices = override
      return 'BULK_OVERRIDE';
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev => 
      prev.includes(roomId)
        ? prev.filter(r => r !== roomId)
        : [...prev, roomId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!overridePrice || parseFloat(overridePrice) <= 0) {
      toast.error("Please enter a valid override price");
      return;
    }

    if (selectedDays.length === 0) {
      toast.error("Please select at least one day of the week");
      return;
    }

    if (selectedRooms.length === 0) {
      toast.error("Please select at least one room");
      return;
    }

    if (startDate >= endDate) {
      toast.error("End date must be after start date");
      return;
    }

    setLoading(true);
    
    // Generate all dates in range that match selected days of week
    const generateDatesInRange = () => {
      const dates = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        if (selectedDays.includes(currentDate.getDay())) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    };

    // Generate price entries for all matching dates and rooms
    const targetDates = generateDatesInRange();
    const targetRoomIds = priceType === 'ROOM_OVERRIDE' ? selectedRooms : rooms.map(r => r.id);

    const currentPricesMap = getCurrentPrices(targetDates, targetRoomIds);
    const calculatedActionType = calculateActionType(targetDates, targetRoomIds, parseFloat(overridePrice), currentPricesMap);
    setBulkActionType(calculatedActionType);
    
    const priceEntries = [];

    if (priceType === 'ROOM_OVERRIDE') {
      // Create entries for each room and date combination
      for (const roomId of selectedRooms) {
        for (const date of targetDates) {
          priceEntries.push({
            roomId,
            date: date.toISOString(),
            price: parseFloat(overridePrice),
            priceType: 'ROOM_OVERRIDE'
          });
        }
      }
    } else {
      // For BASE_OVERRIDE, create entries for all rooms and dates
      const allRoomIds = rooms.map(r => r.id);
      for (const roomId of allRoomIds) {
        for (const date of targetDates) {
          priceEntries.push({
            roomId,
            date: date.toISOString(),
            price: parseFloat(overridePrice),
            priceType: 'BASE_OVERRIDE'
          });
        }
      }
    }

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
            prices: priceEntries,
            bulkActionType: calculatedActionType
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to apply bulk price override");
      }

      toast.success(`Bulk price override applied successfully for ${priceEntries.length} date/room combinations`);
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply bulk price override");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Bulk Price Override
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rate Policy Info */}
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="text-sm text-gray-600">
              <div><strong>Rate Policy:</strong> {ratePolicy.name}</div>
              <div><strong>Description:</strong> {ratePolicy.description || 'No description'}</div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => date && setStartDate(date)}
                dateFormat="dd/MM/yyyy"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholderText="Select start date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => date && setEndDate(date)}
                dateFormat="dd/MM/yyyy"
                minDate={startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholderText="Select end date"
              />
            </div>
          </div>

          {/* Days of Week Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Days of Week *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {dayNames.map((day, index) => (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(index)}
                    onChange={() => handleDayToggle(index)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{day}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedDays([0, 6])}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
              >
                Weekends Only
              </button>
              <button
                type="button"
                onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              >
                Weekdays Only
              </button>
              <button
                type="button"
                onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              >
                All Days
              </button>
            </div>
          </div>

          {/* Price Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Override Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-md hover:bg-gray-50">
                <input
                  type="radio"
                  value="ROOM_OVERRIDE"
                  checked={priceType === 'ROOM_OVERRIDE'}
                  onChange={(e) => setPriceType(e.target.value as 'ROOM_OVERRIDE')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Room Override</div>
                  <div className="text-sm text-gray-500">Override specific room prices</div>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-md hover:bg-gray-50">
                <input
                  type="radio"
                  value="BASE_OVERRIDE"
                  checked={priceType === 'BASE_OVERRIDE'}
                  onChange={(e) => setPriceType(e.target.value as 'BASE_OVERRIDE')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Base Override</div>
                  <div className="text-sm text-gray-500">Override base price for all rooms</div>
                </div>
              </label>
            </div>
          </div>

          {/* Room Selection - Only show if Room Override is selected */}
          {priceType === 'ROOM_OVERRIDE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Rooms *
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {rooms.map((room) => (
                    <label key={room.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(room.id)}
                        onChange={() => handleRoomToggle(room.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedRooms(rooms.map(r => r.id))}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRooms([])}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Override Price */}
          <div>
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
          </div>

          {/* Summary */}
          {startDate && endDate && selectedDays.length > 0 && overridePrice && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <div className="text-sm text-blue-800">
                <div>Period: {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}</div>
                <div>Days: {selectedDays.map(d => dayNames[d]).join(', ')}</div>
                <div>Price: €{parseFloat(overridePrice).toFixed(2)}</div>
                <div>Type: {priceType === 'ROOM_OVERRIDE' ? 'Room Override' : 'Base Override'}</div>
                {priceType === 'ROOM_OVERRIDE' && (
                  <div>Rooms: {selectedRooms.length} selected</div>
                )}
                {bulkActionType && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bulkActionType === 'BULK_INCREASE' ? 'bg-green-100 text-green-800' :
                      bulkActionType === 'BULK_DECREASE' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bulkActionType === 'BULK_INCREASE' ? '📈 Price Increase' :
                       bulkActionType === 'BULK_DECREASE' ? '📉 Price Decrease' :
                       '🔄 Price Override'}
                    </span>
                  </div>
                )}
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
              {loading ? "Applying..." : "Apply Bulk Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}