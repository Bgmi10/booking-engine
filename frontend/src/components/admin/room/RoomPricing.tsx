/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState, useEffect } from 'react';
import { RiSaveLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { useAuth } from '../../../context/AuthContext';
import { baseUrl } from '../../../utils/constants'; // Import baseUrl

// Assuming Room interface is similar to the one in Rooms.tsx
// It would be best to move this to a shared types file
interface RoomImage {
  id: string;
  url: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
}

interface RoomRate {
  // Define if needed, for now, keeping it simple as per pricing focus
  ratePolicy: any; 
}

interface Room {
  id: string;
  name: string;
  price: number; // This will store the calculated absolute price
  description: string;
  capacity: number;
  amenities: string[];
  images: RoomImage[];
  createdAt: string;
  RoomRate: RoomRate[];
  updatedAt: string;
  // We might need a way to store the last applied percentage if we want to show it in the input initially
  // For now, inputs will be for new percentage adjustments relative to current base price
  // Or, we can derive initial percentage from current room.price and a (potentially new) basePrice, but that can be complex if basePrice changes.
  // Let's assume for now `room.price` is the source of truth and inputs are for setting a new percentage against the current basePrice.
}

interface RoomPricingProps {
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
}

// Helper to format price display
const formatPriceDisplay = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

// Helper to calculate price based on base and percentage
const calculatePrice = (base: number, percentageStr?: string): number => {
  const percentage = parseFloat(percentageStr || "0");
  if (!isNaN(percentage) && base > 0) { // ensure base is positive for meaningful percentage calculation
    return base + (base * percentage / 100);
  }
  return base;
};

export default function RoomPricing({ rooms, setRooms, setError, setSuccess }: RoomPricingProps) {
  const { user, setUser }: { user: any, setUser?: any } = useAuth();
  
  const [componentBasePrice, setComponentBasePrice] = useState<number>(0);
  const [initialContextBasePriceSnapshot, setInitialContextBasePriceSnapshot] = useState<number>(0);
  const [initialRoomPricesSnapshot, setInitialRoomPricesSnapshot] = useState<{ [roomId: string]: number }>({});
  const [editedPercentages, setEditedPercentages] = useState<{ [roomId: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentActualBasePrice = user?.basePrice !== undefined && user?.basePrice !== null ? Number(user.basePrice) : 0;
    setComponentBasePrice(currentActualBasePrice);
    setInitialContextBasePriceSnapshot(currentActualBasePrice);

    const pricesSnapshot: { [roomId: string]: number } = {};
    const initialPercentages: { [roomId: string]: string } = {};

    rooms.forEach(room => {
      pricesSnapshot[room.id] = room.price;
      if (currentActualBasePrice > 0 && room.price !== currentActualBasePrice) {
        const increment = room.price - currentActualBasePrice;
        const percentage = (increment / currentActualBasePrice) * 100;
        initialPercentages[room.id] = percentage !== 0 ? percentage.toFixed(2) : "";
      } else {
        initialPercentages[room.id] = ""; 
      }
    });
    setInitialRoomPricesSnapshot(pricesSnapshot);
    setEditedPercentages(initialPercentages);

  }, [user?.basePrice, rooms]);

  const handlePercentageInputChange = (roomId: string, value: string) => {
    setEditedPercentages(prev => ({ ...prev, [roomId]: value }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    let anyApiCallMade = false;
    //@ts-ignore
    let basePriceUpdateSuccess = true;
    let roomsDataForParentUpdate = [...rooms];
    let newSnapShotBasePrice = initialContextBasePriceSnapshot;
    let successMessageAccumulator = "";

    try {
      // 1. Update Base Price if changed
      if (componentBasePrice !== initialContextBasePriceSnapshot) {
        anyApiCallMade = true;
        const res = await fetch(`${baseUrl}/admin/base-price`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ basePrice: componentBasePrice }),
        });
        const data = await res.json();
        if (!res.ok) {
          basePriceUpdateSuccess = false;
          throw new Error(data.message || 'Failed to update base price.');
        }
        successMessageAccumulator += "Base price updated successfully! ";
        newSnapShotBasePrice = componentBasePrice; // Update snapshot for current session
        setUser((prev: any) => ({ ...prev, basePrice: componentBasePrice }));
      }

      // 2. Update Individual Room Prices if they changed based on new base price and percentages
      const roomUpdatePromises: Promise<any>[] = [];
      const tempUpdatedRooms = rooms.map(room => {
        const finalCalculatedPrice = calculatePrice(componentBasePrice, editedPercentages[room.id]);
        // Check if the final calculated absolute price is different from its initial snapshot
        if (Math.abs(finalCalculatedPrice - (initialRoomPricesSnapshot[room.id] || 0)) > 0.001) { // Compare with tolerance for floats
          anyApiCallMade = true;
          roomUpdatePromises.push(
            fetch(`${baseUrl}/admin/rooms/${room.id}/price`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ roomId: room.id, price: finalCalculatedPrice }),
            })
            .then(async res => {
              if (!res.ok) {
                const errData = await res.json();
                // Accumulate errors or throw for Promise.all to catch
                throw new Error(`Failed to update price for ${room.name}: ${errData.message || res.statusText}`);
              }
              return { ...room, price: finalCalculatedPrice }; // Return updated room part for state update
            })
            .catch(err => {
              throw err; // Propagate error
            })
          );
          return { ...room, price: finalCalculatedPrice }; // Optimistic update for roomsDataForParentUpdate
        }        
        return room; // No change for this room, return as is
      });
      
      roomsDataForParentUpdate = tempUpdatedRooms; // Reflect optimistic updates immediately

      if (roomUpdatePromises.length > 0) {
        const results = await Promise.allSettled(roomUpdatePromises);
        const failedUpdates = results.filter(r => r.status === 'rejected');
        
        if (failedUpdates.length > 0) {
          const errorMessages = failedUpdates.map(f => (f as PromiseRejectedResult).reason?.message || 'Unknown error').join("; ");
          throw new Error(`Some room prices failed to update: ${errorMessages}`);
        }
        successMessageAccumulator += "Room prices updated successfully!";
      }

      if (!anyApiCallMade) {
        successMessageAccumulator = "No changes to save.";
      } 
      
      if (successMessageAccumulator.trim() !== "") {
        setSuccess(successMessageAccumulator.trim());
      }

      // If any API call was made and all were successful (or no room updates were needed after a base price update)
      // we need to update parent state and local snapshots.
      if (anyApiCallMade) { // Only update if actual changes were pushed
        setRooms(roomsDataForParentUpdate);
        setInitialContextBasePriceSnapshot(newSnapShotBasePrice);
        const newPricesSnapshot: { [roomId: string]: number } = {};
        roomsDataForParentUpdate.forEach(room => {
            newPricesSnapshot[room.id] = room.price;
        });
        setInitialRoomPricesSnapshot(newPricesSnapshot);
      }

    } catch (error: any) {
      setError(error.message || "An error occurred during save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Manage Room Pricing</h2>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label htmlFor="basePriceInput" className="block text-sm font-medium text-gray-700 mb-1">
            Set Global Base Price (€)
          </label>
          <input
            type="number"
            id="basePriceInput"
            name="basePrice"
            value={componentBasePrice} // Controlled by componentBasePrice state
            onChange={(e) => setComponentBasePrice(parseFloat(e.target.value) || 0)} 
            className="mt-1 block w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., 100"
            step="0.01"
          />
          <p className="mt-1 text-xs text-gray-500">This price is used as the foundation for individual room pricing.</p>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Individual Room Pricing (Percentage based)</h3>
          {rooms.length === 0 ? (
            <p className="text-gray-500">No rooms available to price. Please add rooms in the 'Details' tab.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage Increment (%)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calculated Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms.map((room) => {
                    const displayPrice = calculatePrice(componentBasePrice, editedPercentages[room.id]);
                    return (
                      <tr key={room.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {room.name.charAt(0).toUpperCase() + room.name.slice(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={editedPercentages[room.id] || ''} 
                            onChange={(e) => handlePercentageInputChange(room.id, e.target.value)}
                            className="mt-1 block w-full min-w-[100px] max-w-[150px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="e.g., 10 or blank for base"
                            step="0.01"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatPriceDisplay(displayPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {rooms.length > 0 && (
          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <BiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Saving...
                </>
              ) : (
                <>
                  <RiSaveLine className="-ml-1 mr-2 h-5 w-5" />
                  Save Price Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 