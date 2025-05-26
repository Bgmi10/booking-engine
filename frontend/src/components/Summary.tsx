/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Users, BarChart3, Plus, Tag } from 'lucide-react';

export default function Summary({ bookingData, bookingItems, setBookingItems, setBookingData, setCurrentStep, availabilityData }: { bookingData: any, bookingItems: any, setBookingItems: any, setBookingData: any, setCurrentStep: any, availabilityData: any }) {
  const [expandedItems, setExpandedItems] = useState<any>({});
  
  const selectedRoom = availabilityData?.availableRooms?.find((room: any) => room.id === bookingData.selectedRoom);

  console.log(selectedRoom)

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

  const calculateNights = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
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

  const handleAddAnotherItem = () => {
    // Create a copy of current booking data with room details for bookingItems
    const bookingCopy = {
      ...bookingData,
      id: Date.now().toString(),
      roomDetails: selectedRoom // Include full room data
    };

    // Add current booking to bookingItems array
    setBookingItems((prev: any) => [...prev, bookingCopy]);

    // Reset specific attributes while keeping dates and promotion code
    setBookingData((prev: any) => ({
      ...prev,
      adults: 2,
      selectedRoom: null,
      selectedEnhancements: [],
      selectedRateOption: null,
      totalPrice: 0,
      rooms: 1
    }));

    // Go back to Categories step
    setCurrentStep(2);
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
    
    // If no booking items exist and we have a current booking, show it
    if (items.length === 0 && bookingData.selectedRoom && (bookingData.selectedRateOption || bookingData.totalPrice > 0)) {
      items.push({ 
        ...bookingData, 
        id: 'current',
        roomDetails: selectedRoom // Add current room details
      });
    }
    // If we have booking items and a current booking, add current booking
    else if (items.length > 0 && bookingData.selectedRoom && bookingData.selectedRateOption) {
      items.push({ 
        ...bookingData, 
        id: 'current',
        roomDetails: selectedRoom // Add current room details
      });
    }
    
    return items;
  };

  const allItems = getAllItems();

  const calculateSubtotal = () => {
    return allItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateDisplayTax = (subtotal: number) => {
    return Math.round(subtotal * 0.1 / 1.1 * 100) / 100;
  };

  const grandTotal = calculateSubtotal();
  const displayTax = calculateDisplayTax(grandTotal);

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Summary</h1>
      </div>

      <div className="space-y-6">
        {allItems.map((item, index) => {
          const nights = calculateNights(item.checkIn, item.checkOut);
          const basePrice = calculateItemBasePrice(item);
          const enhancementsPrice = calculateItemEnhancementsPrice(item);
          const itemTotal = calculateItemTotal(item);
          
          return (
            <div key={item.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-4">
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
                        {item.selectedRateOption?.discountPercentage > 0 && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                            <Tag className="w-3 h-3" />
                            -{item.selectedRateOption.discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown */}
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

                    {item.selectedEnhancements && item.selectedEnhancements.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleExpanded(index)}
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          {expandedItems[index] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          View enhancements ({item.selectedEnhancements.length})
                        </button>
                        
                        {expandedItems[index] && (
                          <div className="mt-2 pl-4 border-l-2 border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Enhancements:</h4>
                            {item.selectedEnhancements.map((enhancement: any) => (
                              <div key={enhancement.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={enhancement.image} 
                                    alt={enhancement.title}
                                    className="w-8 h-8 rounded object-cover"
                                  />
                                  <div>
                                    <span className="text-sm font-medium">{enhancement.title}</span>
                                    <p className="text-xs text-gray-500">{enhancement.description}</p>
                                    <p className="text-xs text-gray-400">
                                      €{enhancement.price} × {item.adults} adults
                                    </p>
                                  </div>
                                </div>
                                <span className="text-sm font-medium">
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
              </div>
            </div>
          );
        })}

        {/* Add Another Item Button - only show if we have at least one item */}
        {allItems.length > 0 && (
          <div className="text-center py-4">
            <button
              onClick={handleAddAnotherItem}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add another item
            </button>
          </div>
        )}

        {/* Price Summary */}
        {allItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-3">
              {allItems.map((item, index) => {
                const itemTotal = calculateItemTotal(item);
                const nights = calculateNights(item.checkIn, item.checkOut);
                
                return (
                  <div key={item.id || index} className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-700">
                        {getRoomName(item)} + {item.selectedRateOption?.name || 'Standard Rate'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {nights} nights × {item.rooms || 1} room{(item.rooms || 1) > 1 ? 's' : ''}
                        {item.selectedEnhancements?.length > 0 && (
                          <span> + {item.selectedEnhancements.length} enhancement{item.selectedEnhancements.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-medium">€{itemTotal.toFixed(2)}</span>
                  </div>
                );
              })}
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-700">IVA 10%</span>
                <div className="text-right">
                  <div className="font-medium">€{displayTax.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Taxes included in price</div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                <span className="text-xl font-semibold">Total</span>
                <span className="text-xl font-semibold">€{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setCurrentStep(5)}
                className="w-full bg-gray-800 text-white py-3 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Show message if no items */}
        {allItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No booking items yet</p>
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-gray-800 text-white py-2 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium"
            >
              Start Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}