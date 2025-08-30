/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Users, BarChart3, Plus, X, AlertTriangle } from 'lucide-react';
import { calculateNights } from '../utils/format';

export default function Summary({ bookingData, bookingItems, setBookingItems, setBookingData, setCurrentStep, availabilityData }: { bookingData: any, bookingItems: any, setBookingItems: any, setBookingData: any, setCurrentStep: any, availabilityData: any, taxPercentage?: number }) {
  const [expandedItems, setExpandedItems] = useState<any>({});
  const [conflicts, setConflicts] = useState<any[]>([]);
  
  const selectedRoom = availabilityData?.availableRooms?.find((room: any) => room.id === bookingData.selectedRoom);

  useEffect(() => {
    const checkConflicts = () => {
      const allItems = getAllItems();
      const conflictingItems: any[] = [];

      for (let i = 0; i < allItems.length; i++) {
        for (let j = i + 1; j < allItems.length; j++) {
          const item1 = allItems[i];
          const item2 = allItems[j];
          
          // Check if same room
          if (item1.selectedRoom === item2.selectedRoom) {
            const checkIn1 = new Date(item1.checkIn);
            const checkOut1 = new Date(item1.checkOut);
            const checkIn2 = new Date(item2.checkIn);
            const checkOut2 = new Date(item2.checkOut);

            // Check for date overlap
            const hasOverlap = checkIn1 < checkOut2 && checkIn2 < checkOut1;
            
            if (hasOverlap) {
              // Mark both items as conflicting
              if (!conflictingItems.some(c => c.id === item1.id)) {
                conflictingItems.push({ ...item1, conflictWith: item2.id });
              }
              if (!conflictingItems.some(c => c.id === item2.id)) {
                conflictingItems.push({ ...item2, conflictWith: item1.id });
              }
            }
          }
        }
      }

      setConflicts(conflictingItems);

      // Auto-remove conflicts (keep the first one, remove duplicates)
      if (conflictingItems.length > 0) {
        const itemsToRemove = new Set();
        
        // Group conflicts by room
        const roomConflicts: any = {};
        conflictingItems.forEach(item => {
          if (!roomConflicts[item.selectedRoom]) {
            roomConflicts[item.selectedRoom] = [];
          }
          roomConflicts[item.selectedRoom].push(item);
        });

        // For each room, keep the first item and mark others for removal
        Object.values(roomConflicts).forEach((conflictGroup: any) => {
          // Sort by creation order (newer items have higher timestamps)
          conflictGroup.sort((a: any, b: any) => {
            const aTime = a.id === 'current' ? Date.now() : parseInt(a.id);
            const bTime = b.id === 'current' ? Date.now() : parseInt(b.id);
            return aTime - bTime;
          });

          // Mark all but the first for removal
          for (let i = 1; i < conflictGroup.length; i++) {
            itemsToRemove.add(conflictGroup[i].id);
          }
        });

        // Remove conflicting items from bookingItems
        if (itemsToRemove.size > 0) {
          setBookingItems((prev: any) => 
            prev.filter((item: any) => !itemsToRemove.has(item.id))
          );

          // If current booking conflicts, reset it
          if (itemsToRemove.has('current')) {
            setBookingData((prev: any) => ({
              checkIn: null,
              checkOut: null,
              ...prev,
              adults: 2,
              selectedRoom: null,
              selectedEnhancements: [],
              selectedRateOption: null,
              totalPrice: 0,
              rooms: 1
            }));
          }
        }
      }
    };

    checkConflicts();
  }, [bookingData, bookingItems, setBookingItems, setBookingData]);

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev: any) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    return `${days[d.getDay()]} ${d.getDate().toString().padStart(2, '0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
  };

  const calculateItemBasePrice = (item: any) => {
    const nights = calculateNights(item.checkIn, item.checkOut);
    const rooms = item.rooms || 1;
    const ratePrice = item.selectedRateOption?.price || 0;
    return ratePrice * nights * rooms;
  };

  const calculateItemEnhancementsPrice = (item: any) => {
    if (!item.selectedEnhancements || item.selectedEnhancements.length === 0) {
      return 0;
    }
    return item.selectedEnhancements.reduce((sum: number, enhancement: any) => {
      return sum + (enhancement.price * item.adults);
    }, 0);
  };

  const calculateItemTotal = (item: any) => {
    const basePrice = calculateItemBasePrice(item);
    const enhancementsPrice = calculateItemEnhancementsPrice(item);
    return basePrice + enhancementsPrice;
  };

  const handleRemoveItem = (itemId: string) => {
    if (itemId === 'current') {
      // Reset current booking data
      setBookingData((prev: any) => ({
        checkIn: null,
        checkOut: null,
        ...prev,
        adults: 2,
        selectedRoom: null,
        selectedEnhancements: [],
        selectedRateOption: null,
        totalPrice: 0,
        rooms: 1
      }));
    } else {
      // Remove from booking items
      setBookingItems((prev: any) => prev.filter((item: any) => item.id !== itemId));
    }
  };

  const handleAddAnotherItem = () => {
    // Only add if current booking is complete
    if (bookingData.selectedRoom && (bookingData.selectedRateOption || bookingData.totalPrice > 0)) {
      const bookingCopy = {
        ...bookingData,
        id: Date.now().toString(), // Use timestamp as unique ID
        roomDetails: selectedRoom
      };
  
      setBookingItems((prev: any) => [...prev, bookingCopy]);
    }
  
    // Reset booking data for new item
    setBookingData((prev: any) => ({
      checkIn: null,
      checkOut: null,
      ...prev,
      adults: 2,
      selectedRoom: null,
      selectedEnhancements: [],
      selectedRateOption: null,
      totalPrice: 0,
      rooms: 1
    }));
  
    setCurrentStep(1);
  };

  const getRoomName = (item: any) => {
    // First try to get room name from stored room details
    if (item.roomDetails?.name) {
      return item.roomDetails.name;
    }
    
    // Fallback to room ID lookup
    const roomId = item.selectedRoom;
    if (availabilityData?.availableRooms) {
      const room = availabilityData.availableRooms.find((r: any) => r.id === roomId);
      if (room?.name) {
        return room.name;
      }
    }
    
    // Final fallback to hardcoded names
    if (roomId === "54202303-615d-4cf0-bf79-f1b46dfccc65") {
      return "Fagiano - Garden View Terrace";
    }
    return "Fenicottero - Vineyard View";
  };

  // Prepare all items for display
  const getAllItems = () => {
    const items = [...bookingItems];
    
    // Only add current booking data if it's complete (has a selected room and rate)
    const isCurrentBookingComplete = bookingData.selectedRoom && 
      (bookingData.selectedRateOption || bookingData.totalPrice > 0);
    
    if (isCurrentBookingComplete) {
      // Check if current booking is already in bookingItems
      const isAlreadyAdded = bookingItems.some((item: any) => 
        item.id === 'current' || 
        (item.selectedRoom === bookingData.selectedRoom && 
         item.checkIn === bookingData.checkIn && 
         item.checkOut === bookingData.checkOut));
      
      if (!isAlreadyAdded) {
        items.push({ 
          ...bookingData, 
          id: 'current',
          roomDetails: selectedRoom
        });
      }
    }
    
    return items;
  };

  const allItems = getAllItems();

   useEffect(() => {
    const allItems = getAllItems();
    
    // Only update if there are items and they're different from current bookingItems
    if (allItems.length > 0) {
      // Filter out items that are already in bookingItems to avoid duplicates
      const newItems = allItems.filter(item => {
        // Don't add items that already exist in bookingItems
        if (item.id === 'current') {
          // For current booking, check if there's already a similar item
          return !bookingItems.some((existingItem: any) => 
            existingItem.selectedRoom === item.selectedRoom && 
            existingItem.checkIn === item.checkIn && 
            existingItem.checkOut === item.checkOut
          );
        }
        // For other items, check by ID
        return !bookingItems.some((existingItem: any) => existingItem.id === item.id);
      });

      // If we have new items to add, update the state
      if (newItems.length > 0) {
        const itemsToAdd = newItems.map(item => {
          if (item.id === 'current') {
            return {
              ...item,
              id: Date.now().toString(), // Convert current to permanent ID
              roomDetails: selectedRoom
            };
          }
          return item;
        });

        setBookingItems((prev: any) => {
          // Double check for duplicates before adding
          const filtered = itemsToAdd.filter(newItem => 
            !prev.some((existingItem: any) => 
              existingItem.id === newItem.id ||
              (existingItem.selectedRoom === newItem.selectedRoom && 
               existingItem.checkIn === newItem.checkIn && 
               existingItem.checkOut === newItem.checkOut)
            )
          );
          return [...prev, ...filtered];
        });
      }
    }
   }, []);

  useEffect(() => {
   if (allItems.length === 0) {
     setCurrentStep(2);
     return;
   }
  }, [handleRemoveItem])

  
  const calculateSubtotal = () => {
    return allItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const grandTotal = calculateSubtotal();

  const isItemConflicting = (itemId: string) => {
    return conflicts.some(conflict => conflict.id === itemId);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 min-h-screen">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Summary</h1>
      </div>

      {/* Conflict Warning */}
      {conflicts.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Booking Conflicts Detected</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Some items had overlapping dates for the same room and have been automatically removed. 
                The earliest booking for each room has been kept.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        {allItems.map((item, index) => {
          const nights = calculateNights(item.checkIn, item.checkOut);
          const basePrice = calculateItemBasePrice(item);
          const enhancementsPrice = calculateItemEnhancementsPrice(item);
          const itemTotal = calculateItemTotal(item);
          const isConflicting = isItemConflicting(item.id);
          
          return (
            <div key={item.id || index} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${isConflicting ? 'ring-2 ring-yellow-200' : ''}`}>
              <div className="p-4 sm:p-6">
                {/* Remove Button */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove item"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Layout */}
                <div className="block sm:hidden">
                  {/* Room Image */}
                  <div className="w-full h-40 rounded-lg overflow-hidden mb-4">
                    {item.roomDetails?.images?.[0]?.url ? (
                      <img
                        src={item.roomDetails.images[0].url}
                        alt={getRoomName(item)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-medium">
                        Room
                      </div>
                    )}
                  </div>
                  
                  {/* Room Info */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-800 pr-2">
                        {getRoomName(item)}
                      </h3>
                      <span className="text-lg font-semibold text-right">€{itemTotal.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="break-words">{formatDate(item.checkIn)} - {formatDate(item.checkOut)} ({nights} nights)</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>Adults: {item.adults} | Rooms: {item.rooms || 1}</span>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <BarChart3 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="break-words">Rate: {item.selectedRateOption?.name || 'Standard Rate'}</span>
                          {item.selectedPaymentStructure === 'SPLIT_PAYMENT' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                Split Payment (30% + 70%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Breakdown - Mobile */}
                    <div className="text-sm bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between text-gray-600 mb-1">
                        <span className="text-xs">Room rate ({nights} nights × {item.rooms || 1} room{(item.rooms || 1) > 1 ? 's' : ''})</span>
                        <span className="text-xs">€{basePrice.toFixed(2)}</span>
                      </div>
                      {enhancementsPrice > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span className="text-xs">Enhancements ({item.adults} adults)</span>
                          <span className="text-xs">€{enhancementsPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-start gap-4">
                  <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    {item.roomDetails?.images?.[0]?.url ? (
                      <img
                        src={item.roomDetails.images[0].url}
                        alt={getRoomName(item)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-medium">
                        Room
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {getRoomName(item)}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">€{itemTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(item.checkIn)} - {formatDate(item.checkOut)} ({nights} nights)</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Adults: {item.adults} | Rooms: {item.rooms || 1}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>Rate: {item.selectedRateOption?.name || 'Standard Rate'}</span>
                        {item.selectedPaymentStructure === 'SPLIT_PAYMENT' && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            Split Payment (30% + 70%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown - Desktop */}
                    <div className="mt-3 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Room rate ({nights} nights × {item.rooms || 1} room{(item.rooms || 1) > 1 ? 's' : ''})</span>
                        <span>€{basePrice.toFixed(2)}</span>
                      </div>
                      {enhancementsPrice > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Enhancements ({item.adults} adults)</span>
                          <span>€{enhancementsPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhancements Section - Common for both layouts */}
                {item.selectedEnhancements && item.selectedEnhancements.length > 0 && (
                  <div className="mt-4 sm:mt-3">
                    <button
                      onClick={() => toggleExpanded(index)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                    >
                      {expandedItems[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      View enhancements ({item.selectedEnhancements.length})
                    </button>
                    
                    {expandedItems[index] && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Enhancements:</h4>
                        {item.selectedEnhancements.map((enhancement: any) => (
                          <div key={enhancement.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0 gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <img 
                                src={enhancement.image} 
                                alt={enhancement.title}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium block">{enhancement.title}</span>
                                <p className="text-xs text-gray-500 break-words">{enhancement.description}</p>
                                <p className="text-xs text-gray-400">
                                  €{enhancement.price} × {item.adults} adults
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-medium flex-shrink-0">
                              €{(enhancement.price * item.adults).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Another Item Button - only show if we have at least one item */}
        {allItems.length > 0 && (
          <div className="text-center py-4">
            <button
              onClick={handleAddAnotherItem}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Add another item
            </button>
          </div>
        )}

        {/* Price Summary */}
        {allItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="space-y-3">
              {allItems.map((item, index) => {
                const itemTotal = calculateItemTotal(item);
                const nights = calculateNights(item.checkIn, item.checkOut);
                
                return (
                  <div key={item.id || index} className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-700 text-sm sm:text-base break-words">
                        {getRoomName(item)} + {item.selectedRateOption?.name || 'Standard Rate'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {nights} nights × {item.rooms || 1} room{(item.rooms || 1) > 1 ? 's' : ''}
                        {item.selectedEnhancements?.length > 0 && (
                          <span> + {item.selectedEnhancements.length} enhancement{item.selectedEnhancements.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-sm sm:text-base flex-shrink-0">€{itemTotal.toFixed(2)}</span>
                  </div>
                );
              })}
              
              {/* <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-700 text-sm sm:text-base">IVA {(taxPercentage * 100).toFixed(0)}%</span>
                <div className="text-right">
                  <div className="font-medium text-sm sm:text-base">€{displayTax.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Taxes included in price</div>
                </div>
              </div> */}

              <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                <span className="text-lg sm:text-xl font-semibold">Total</span>
                <span className="text-lg sm:text-xl font-semibold">€{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  // If we have a current booking that's not in bookingItems yet, add it
                  if (bookingData.selectedRoom && (bookingData.selectedRateOption || bookingData.totalPrice > 0)) {
                    const isAlreadyAdded = bookingItems.some((item: any) => 
                      item.id === 'current' || 
                      (item.selectedRoom === bookingData.selectedRoom && 
                       item.checkIn === bookingData.checkIn && 
                       item.checkOut === bookingData.checkOut));
                    
                    if (!isAlreadyAdded) {
                      setBookingItems((prev: any) => [
                        ...prev, 
                        {
                          ...bookingData,
                          id: Date.now().toString(),
                          roomDetails: selectedRoom
                        }
                      ]);
                    }
                  }
                  setCurrentStep(5);
                }}
                className="w-full bg-gray-800 text-white py-3 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium cursor-pointer"
              >
                {allItems.some(item => item.selectedPaymentStructure === 'SPLIT_PAYMENT') 
                  ? `Pay Now - €${allItems.reduce((sum, item) => {
                      const itemTotal = calculateItemTotal(item);
                      return sum + (item.selectedPaymentStructure === 'SPLIT_PAYMENT' ? itemTotal * 0.3 : itemTotal);
                    }, 0).toFixed(2)}`
                  : 'Continue'
                }
              </button>
            </div>
          </div>
        )}

        {/* Show message if no items */}
        {allItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-base sm:text-lg mb-4">No booking items yet</p>
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-gray-800 text-white py-2 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium cursor-pointer" 
            >
              Start Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}