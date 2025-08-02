import React, { useState, useEffect } from 'react';
import { RiSaveLine, RiSearchLine, RiCalendarLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { useAuth } from '../../../context/AuthContext';
import { baseUrl } from '../../../utils/constants';
import { format, addDays, startOfDay, eachDayOfInterval, isBefore } from 'date-fns';
import { toast } from 'react-hot-toast';
import type { RoomForPricing, RoomDatePrice, UnifiedPricingTableProps } from '../../../types/types';

const formatPriceDisplay = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const calculatePrice = (base: number, percentageStr?: string): number => {
  const percentage = parseFloat(percentageStr || "0");
  if (!isNaN(percentage) && base > 0) {
    const result = base + (base * percentage / 100);
    return Math.round(result * 100) / 100;
  }
  return Math.round(base * 100) / 100;
};

export default function UnifiedPricingTable({ rooms, setRooms }: UnifiedPricingTableProps) {
  const { user, setUser }: { user: any, setUser?: any } = useAuth();
  
  // Base pricing states
  const [componentBasePrice, setComponentBasePrice] = useState<number>(0);
  const [initialContextBasePriceSnapshot, setInitialContextBasePriceSnapshot] = useState<number>(0);
  const [initialRoomPricesSnapshot, setInitialRoomPricesSnapshot] = useState<{ [roomId: string]: number }>({});
  const [roomBasePricePercentages, setRoomBasePricePercentages] = useState<{ [roomId: string]: string }>({});
  
  // Dynamic pricing states
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    const futureDate = addDays(new Date(), 14);
    return format(futureDate, 'yyyy-MM-dd');
  });
  const [roomDatePrices, setRoomDatePrices] = useState<{ [key: string]: { [date: string]: number } }>({});
  const [existingPrices, setExistingPrices] = useState<RoomDatePrice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  
  const generateDateRange = () => {
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = startOfDay(new Date());
    
    if (isBefore(end, start)) return [];
    
    return eachDayOfInterval({ start, end })
      .filter(date => !isBefore(startOfDay(date), today))
      .map(date => format(date, 'yyyy-MM-dd'));
  };

  const dateRange = generateDateRange();
  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Initialize base pricing
  useEffect(() => {
    const currentActualBasePrice = user?.basePrice !== undefined && user?.basePrice !== null ? Number(user.basePrice) : 0;
    setComponentBasePrice(currentActualBasePrice);
    setInitialContextBasePriceSnapshot(currentActualBasePrice);

    const pricesSnapshot: { [roomId: string]: number } = {};
    const basePricePercentages: { [roomId: string]: string } = {};

    rooms.forEach(room => {
      pricesSnapshot[room.id] = room.price;
      if (currentActualBasePrice > 0 && room.price !== currentActualBasePrice) {
        const increment = room.price - currentActualBasePrice;
        const percentage = (increment / currentActualBasePrice) * 100;
        const roundedPercentage = Math.round(percentage * 100) / 100;
        basePricePercentages[room.id] = roundedPercentage !== 0 ? roundedPercentage.toString() : "";
      } else {
        basePricePercentages[room.id] = ""; 
      }
    });
    setInitialRoomPricesSnapshot(pricesSnapshot);
    setRoomBasePricePercentages(basePricePercentages);
  }, [user?.basePrice, rooms]);

  const fetchExistingPrices = async () => {
    if (!startDate || !endDate || rooms.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/admin/rooms/date-prices?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch existing prices');
      }

      const data = await response.json();
      const existingPricesData = data.data || [];
      setExistingPrices(existingPricesData);
      
      // Initialize room date prices with existing data or calculated room base prices
      const initialPrices: { [key: string]: { [date: string]: number } } = {};
      
      rooms.forEach(room => {
        initialPrices[room.id] = {};
        const roomBasePrice = getRoomBasePrice(room.id);
        
        dateRange.forEach(date => {
          const existingPrice = existingPricesData.find((p: RoomDatePrice) => {
            const apiDate = format(new Date(p.date), 'yyyy-MM-dd');
            return p.roomId === room.id && apiDate === date && p.isActive;
          });
          
          if (existingPrice) {
            initialPrices[room.id][date] = Math.round(existingPrice.price * 100) / 100;
          } else {
            // Use the calculated room base price as default
            initialPrices[room.id][date] = roomBasePrice;
          }
        });
      });
      
      setRoomDatePrices(initialPrices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      toast.error('Failed to load existing prices');
      
      // Even on error, initialize with base prices
      const initialPrices: { [key: string]: { [date: string]: number } } = {};
      rooms.forEach(room => {
        initialPrices[room.id] = {};
        const roomBasePrice = getRoomBasePrice(room.id);
        dateRange.forEach(date => {
          initialPrices[room.id][date] = roomBasePrice;
        });
      });
      setRoomDatePrices(initialPrices);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch prices if base pricing is initialized
    if (componentBasePrice !== undefined && rooms.length > 0) {
      fetchExistingPrices();
    }
  }, [startDate, endDate, rooms, componentBasePrice, roomBasePricePercentages]);

  // Handle base price percentage change for individual rooms
  const handleBasePricePercentageChange = (roomId: string, value: string) => {
    setRoomBasePricePercentages(prev => ({ ...prev, [roomId]: value }));
  };

  // Handle date-specific price change
  const handleDatePriceChange = (roomId: string, date: string, price: string) => {
    const priceValue = parseFloat(price) || 0;
    const roundedPrice = Math.round(priceValue * 100) / 100;
    
    setRoomDatePrices(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [date]: roundedPrice
      }
    }));
  };

  // Get calculated base price for a room (base price + percentage)
  const getRoomBasePrice = (roomId: string) => {
    const basePrice = componentBasePrice || 0;
    const percentage = roomBasePricePercentages[roomId] || "";
    return calculatePrice(basePrice, percentage);
  };

  // Handle date selection for bulk operations
  const handleDateSelect = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  // Handle select all dates
  const handleSelectAllDates = () => {
    if (selectedDates.length === dateRange.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates([...dateRange]);
    }
  };

  // Apply price to selected dates for a specific room
  const applyPriceToSelected = (roomId: string, price: string) => {
    if (selectedDates.length === 0) {
      toast.error('Please select dates first');
      return;
    }

    const priceValue = parseFloat(price) || 0;
    const roundedPrice = Math.round(priceValue * 100) / 100;

    setRoomDatePrices(prev => {
      const updated = { ...prev };
      if (!updated[roomId]) {
        updated[roomId] = {};
      }
      
      selectedDates.forEach(date => {
        updated[roomId][date] = roundedPrice;
      });
      
      return updated;
    });
    
    toast.success(`Applied €${roundedPrice.toFixed(2)} to ${selectedDates.length} dates`);
  };

  // Apply percentage adjustment to selected dates
  const applyPercentageToSelected = (roomId: string, percentage: string) => {
    if (selectedDates.length === 0) {
      toast.error('Please select dates first');
      return;
    }

    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const percentageValue = parseFloat(percentage) || 0;
    const roomBasePrice = getRoomBasePrice(roomId);
    const newPrice = roomBasePrice + (roomBasePrice * percentageValue / 100);
    const roundedPrice = Math.round(newPrice * 100) / 100;

    setRoomDatePrices(prev => {
      const updated = { ...prev };
      if (!updated[roomId]) {
        updated[roomId] = {};
      }
      
      selectedDates.forEach(date => {
        updated[roomId][date] = roundedPrice;
      });
      
      return updated;
    });
    
    toast.success(`Applied ${percentageValue > 0 ? '+' : ''}${percentageValue}% (€${roundedPrice.toFixed(2)}) to ${selectedDates.length} dates`);
  };

  // Reset all dates for a room to base price
  const resetRoomToBasePrice = (roomId: string) => {
    const roomBasePrice = getRoomBasePrice(roomId);
    
    setRoomDatePrices(prev => {
      const updated = { ...prev };
      if (!updated[roomId]) {
        updated[roomId] = {};
      }
      
      dateRange.forEach(date => {
        updated[roomId][date] = roomBasePrice;
      });
      
      return updated;
    });
    
    const room = rooms.find(r => r.id === roomId);
    toast.success(`Reset ${room?.name || 'room'} to base price €${roomBasePrice.toFixed(2)}`);
  };

  // Save all changes
  const handleSaveAll = async () => {
    setLoading(true);
    let successMessages: string[] = [];

    try {
      // 1. Update Base Price if changed
      if (componentBasePrice !== initialContextBasePriceSnapshot) {
        const res = await fetch(`${baseUrl}/admin/base-price`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ basePrice: componentBasePrice }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to update base price.');
        }
        successMessages.push("Base price updated");
        setUser((prev: any) => ({ ...prev, basePrice: componentBasePrice }));
      }

      // 2. Update Individual Room Base Prices
      const roomUpdatePromises: Promise<any>[] = [];
      const updatedRooms = rooms.map(room => {
        const finalCalculatedPrice = getRoomBasePrice(room.id);
        if (Math.abs(finalCalculatedPrice - (initialRoomPricesSnapshot[room.id] || 0)) > 0.001) {
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
                throw new Error(`Failed to update base price for ${room.name}: ${errData.message || res.statusText}`);
              }
              return { ...room, price: finalCalculatedPrice };
            })
          );
          return { ...room, price: finalCalculatedPrice };
        }        
        return room;
      });

      if (roomUpdatePromises.length > 0) {
        const results = await Promise.allSettled(roomUpdatePromises);
        const failedUpdates = results.filter(r => r.status === 'rejected');
        
        if (failedUpdates.length > 0) {
          const errorMessages = failedUpdates.map(f => (f as PromiseRejectedResult).reason?.message || 'Unknown error').join("; ");
          throw new Error(`Some room base prices failed to update: ${errorMessages}`);
        }
        successMessages.push("Room base prices updated");
        setRooms(updatedRooms);
      }

      // 3. Update Date-specific prices
      const pricesToSave: Array<{
        roomId: string;
        date: string;
        price: number;
      }> = [];

      Object.keys(roomDatePrices).forEach(roomId => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;

        const roomBasePrice = getRoomBasePrice(roomId);

        Object.keys(roomDatePrices[roomId]).forEach(date => {
          const newPrice = roomDatePrices[roomId][date];
          const existingPrice = existingPrices.find(p => {
            const apiDate = format(new Date(p.date), 'yyyy-MM-dd');
            return p.roomId === roomId && apiDate === date && p.isActive;
          });

          // Save if price is different from room base price or if there's an existing custom price
          const priceDiffers = Math.abs(newPrice - roomBasePrice) > 0.01;
          if (priceDiffers || existingPrice) {
            pricesToSave.push({
              roomId,
              date,
              price: Math.round(newPrice * 100) / 100
            });
          }
        });
      });

      if (pricesToSave.length > 0) {
        const response = await fetch(`${baseUrl}/admin/rooms/date-prices`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prices: pricesToSave }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save date-specific prices');
        }
        successMessages.push("Date-specific prices updated");
      }

      if (successMessages.length === 0) {
        toast.success('No changes to save');
      } else {
        toast.success(successMessages.join(', ') + ' successfully!');
      }

      // Refresh data
      setInitialContextBasePriceSnapshot(componentBasePrice);
      const newPricesSnapshot: { [roomId: string]: number } = {};
      updatedRooms.forEach(room => {
          newPricesSnapshot[room.id] = room.price;
      });
      setInitialRoomPricesSnapshot(newPricesSnapshot);
      fetchExistingPrices();

    } catch (error: any) {
      toast.error(error.message || "An error occurred during save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Unified Pricing Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage base prices and date-specific pricing in a single view.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Base Price Input */}
          <div>
            <label htmlFor="basePriceInput" className="block text-sm font-medium text-gray-700 mb-1">
              Global Base Price (€)
            </label>
            <input
              type="number"
              id="basePriceInput"
              value={componentBasePrice}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setComponentBasePrice(Math.round(value * 100) / 100);
              }} 
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 100"
              step="0.01"
            />
          </div>

          {/* Date Range */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Search Rooms */}
          <div>
            <label htmlFor="roomSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Search Rooms
            </label>
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="roomSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rooms..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Load Dates Button */}
        <div className="flex justify-end">
          <button
            onClick={fetchExistingPrices}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <RiCalendarLine className="inline-block mr-2" />
            Refresh Dates
          </button>
        </div>

        {/* Date Selection Info */}
        {selectedDates.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                <strong>{selectedDates.length}</strong> dates selected for bulk operations
              </p>
              <div className="space-x-2">
                <button
                  onClick={handleSelectAllDates}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  {selectedDates.length === dateRange.length ? 'Unselect All' : 'Select All'}
                </button>
                <button
                  onClick={() => setSelectedDates([])}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unified Pricing Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <BiLoader className="animate-spin mr-2" />
            Loading pricing data...
          </div>
        ) : filteredRooms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No rooms available</p>
        ) : dateRange.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Please select a valid date range</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                    Room
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base %
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bulk Operations
                  </th>
                  {dateRange.map(date => (
                    <th key={date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-28">
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleDateSelect(date)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDates.includes(date)}
                          onChange={() => handleDateSelect(date)}
                          className="mr-1"
                        />
                        {format(new Date(date), 'MMM dd')}
                        <div className="text-xs text-gray-400">
                          {format(new Date(date), 'EEE')}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRooms.map((room) => {
                  const roomBasePrice = getRoomBasePrice(room.id);
                  
                  return (
                    <tr key={room.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {room.name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <input
                          type="number"
                          value={roomBasePricePercentages[room.id] || ''}
                          onChange={(e) => handleBasePricePercentageChange(room.id, e.target.value)}
                          step="0.01"
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                        {formatPriceDisplay(roomBasePrice)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {/* Bulk Price Input */}
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              placeholder="Price"
                              step="0.01"
                              min="0"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  applyPriceToSelected(room.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <span className="text-xs text-gray-500">€</span>
                          </div>
                          {/* Bulk Percentage Input */}
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              placeholder="% adj"
                              step="0.01"
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  applyPercentageToSelected(room.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <span className="text-xs text-gray-500">%</span>
                          </div>
                          {/* Reset Button */}
                          <button
                            onClick={() => resetRoomToBasePrice(room.id)}
                            className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 w-full"
                            title="Reset all dates to base price"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                      {dateRange.map(date => {
                        // Get the price from state or use room base price as fallback
                        let currentPrice = roomDatePrices[room.id]?.[date];
                        if (currentPrice === undefined || currentPrice === null) {
                          currentPrice = roomBasePrice;
                        }
                        const hasCustomPrice = Math.abs(currentPrice - roomBasePrice) > 0.01;
                        
                        return (
                          <td key={date} className="px-2 py-4 whitespace-nowrap text-center">
                            <input
                              type="number"
                              value={currentPrice}
                              onChange={(e) => handleDatePriceChange(room.id, date, e.target.value)}
                              step="0.01"
                              min="0"
                              className={`w-20 px-2 py-1 border rounded text-sm text-center ${
                                hasCustomPrice
                                  ? 'border-blue-300 bg-blue-50 text-blue-900 font-medium' 
                                  : 'border-gray-300'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Save Button */}
        {!loading && filteredRooms.length > 0 && dateRange.length > 0 && (
          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <BiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Saving...
                </>
              ) : (
                <>
                  <RiSaveLine className="-ml-1 mr-2 h-5 w-5" />
                  Save All Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}