import { useEffect, useState } from "react";
import BookingSummary from "./BookingSummary";
import { format } from "date-fns";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, User, Plus, Minus, Shield, Clock } from "lucide-react";
import { useEnhancements } from "../hooks/useEnhancements";

export default function Rates({ bookingData, setCurrentStep, availabilityData, setBookingData }: { bookingData: any, setCurrentStep: (step: number) => void, availabilityData: any, setBookingData: any }) {

  const formattedCheckIn = format(new Date(bookingData.checkIn), "yyyy-MM-dd");
  const formattedCheckOut = format(new Date(bookingData.checkOut), "yyyy-MM-dd");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const selectedRoom = availabilityData.availableRooms.find((room: any) => room.id === bookingData.selectedRoom);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [enhancementDetails, setEnhancementDetails] = useState<any>({});
  const [rooms, setRooms] = useState(bookingData.rooms || 1);
  const [adults, setAdults] = useState(bookingData.adults || 2);
  const [expandedRateDetails, setExpandedRateDetails] = useState<{ [key: string]: boolean }>({});

  // Sync adults state with bookingData when it changes externally
  useEffect(() => {
    setAdults(bookingData.adults || 2);
  }, [bookingData.adults]);
  

  //@ts-ignore
  const [selectedPaymentStructures, setSelectedPaymentStructures] = useState<any>({});
  const [showRoomAlternatives, setShowRoomAlternatives] = useState(false);
  const [alternativeRooms, setAlternativeRooms] = useState<any[]>([]);
  const [extraBedConfig, setExtraBedConfig] = useState<{useExtraBed: boolean, extraBedCount: number}>({
    useExtraBed: bookingData.hasExtraBed || false,
    extraBedCount: bookingData.extraBedCount || 0
  });
  
  

  const daysInRange = days.filter(day => {
    const date = new Date(formattedCheckIn);
    while (date <= new Date(formattedCheckOut)) {
      if (date.toLocaleDateString('en-US', { weekday: 'long' }) === day) {
        return true;
      }
      date.setDate(date.getDate() + 1);
    }
    return false;
  });

  // Use the useEnhancements hook to fetch enhancements with proper filtering
  const { 
    enhancements,
  } = useEnhancements({
    days: daysInRange,
    enabled: !!bookingData.checkIn && !!bookingData.checkOut,
    checkIn: formattedCheckIn,
    checkOut: formattedCheckOut,
    roomId: bookingData.selectedRoom
  });

  const events = enhancements.filter(e => e.type === 'EVENT');
  const products = enhancements.filter(e => e.type === 'PRODUCT' || !e.type);
  
  const formatItalianTime = (time: string | null) => {
    if (!time) return '';
    return time + ' (Italy time)';
  };

  // Calculate nights
  const checkInDate = new Date(bookingData.checkIn);
  const checkOutDate = new Date(bookingData.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate maximum guest capacity across all available rooms
  const maxGuestCapacity = availabilityData.availableRooms.reduce((max: number, room: any) => {
    const roomMaxCapacity = room.allowsExtraBed && room.maxCapacityWithExtraBed 
      ? room.maxCapacityWithExtraBed 
      : room.capacity;
    return Math.max(max, roomMaxCapacity);
  }, 0);

  // Handle guest capacity validation and find alternatives
  useEffect(() => {
    if (!selectedRoom) return;

    // Reset all states first for consistency
    setShowRoomAlternatives(false);
    setAlternativeRooms([]);
    setExtraBedConfig({ useExtraBed: false, extraBedCount: 0 });

    const currentAdults = adults; // Use local adults state for immediate updates

    // Always find ALL rooms that can accommodate the guests
    const availableRooms = availabilityData.availableRooms.filter((room: any) => {
      // Check standard capacity
      if (room.capacity >= currentAdults) return true;
      
      // Check capacity with extra beds
      if (room.allowsExtraBed && room.maxCapacityWithExtraBed && 
          room.maxCapacityWithExtraBed >= currentAdults) return true;
      
      return false;
    });

    if (currentAdults > selectedRoom.capacity) {
      // Check if current room supports extra beds
      if (selectedRoom.allowsExtraBed && selectedRoom.maxCapacityWithExtraBed && 
          currentAdults <= selectedRoom.maxCapacityWithExtraBed) {
        // Current room can accommodate with extra beds
        const extraBedsNeeded = currentAdults - selectedRoom.capacity;
        setExtraBedConfig({
          useExtraBed: true,
          extraBedCount: extraBedsNeeded
        });
      }

      // ALWAYS show alternatives when guest count exceeds current room capacity
      // regardless of whether current room has extra bed capability
      const alternatives = availableRooms.filter((room: any) => room.id !== selectedRoom.id);
      
      if (alternatives.length > 0) {
        setAlternativeRooms(alternatives);
        setShowRoomAlternatives(true);
      }
    }
  }, [selectedRoom, adults, availabilityData.availableRooms]);

  // Helper function to calculate rate-specific price for a given date
  const getRatePriceForDate = (ratePolicy: any, dateStr: string) => {
    // First priority: Check if there's a rate-specific price override for this date
    if (ratePolicy.rateDatePrices && ratePolicy.rateDatePrices.length > 0) {
      const rateDatePrice = ratePolicy.rateDatePrices.find((rdp: any) => 
        format(new Date(rdp.date), 'yyyy-MM-dd') === dateStr && rdp.roomId === selectedRoom.id
      );
      
      if (rateDatePrice && rateDatePrice.isActive) {
        return rateDatePrice.price;
      }
    }
    
    // Second priority: Calculate price using rate policy base price + room percentage adjustment
    const basePrice = ratePolicy.basePrice;
    if (basePrice && basePrice > 0) {
      // Find the room rate for this rate policy to get percentage adjustment
      const roomRate = selectedRoom?.RoomRate?.find((rr: any) => rr.ratePolicy.id === ratePolicy.id);
      const percentageAdjustment = roomRate?.percentageAdjustment || 0;
      
      // Calculate final price: base price + percentage adjustment
      const adjustment = (basePrice * percentageAdjustment) / 100;
      return Math.round((basePrice + adjustment) * 100) / 100;
    }
    
    // Only fall back to room price if no base price is set
    return selectedRoom?.price || 0;
  };

  // Calculate price breakdown for each night
  const calculatePriceBreakdown = (ratePolicy: any) => {
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const breakdown: { date: string; price: number; isOverride: boolean }[] = [];
    let totalPrice = 0;
    const currentDate = new Date(checkInDate);
    
    for (let i = 0; i < nights; i++) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      let nightPrice = getRatePriceForDate(ratePolicy, dateStr);
      
      // Check if this is a rate override
      const hasRateOverride = ratePolicy.rateDatePrices?.some((rdp: any) => 
        format(new Date(rdp.date), 'yyyy-MM-dd') === dateStr && 
        rdp.roomId === selectedRoom.id &&
        rdp.isActive
      );
      
      breakdown.push({
        date: dateStr,
        price: nightPrice,
        isOverride: hasRateOverride
      });
      
      totalPrice += nightPrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      breakdown,
      totalPrice,
      averagePrice: totalPrice / nights
    };
  };


  // Prepare rate options - only from server data with rate-specific pricing
  const getRateOptions = () => {
    const options: any = [];

    // Show room rates from server using new rate-based pricing model
    if (selectedRoom?.RoomRate && selectedRoom.RoomRate.length > 0) {
      selectedRoom.RoomRate.forEach((roomRate: any) => {
        if (roomRate.ratePolicy.isActive && roomRate.isActive) {
          // Calculate rate-specific pricing following the same priority logic
          const ratePolicy = roomRate.ratePolicy;
          let finalPrice = selectedRoom?.price || 0; // fallback to room price
          
          // First priority: Check for rate-specific price overrides
          //@ts-ignore
          let hasRateOverride = false;
          if (ratePolicy.rateDatePrices && Array.isArray(ratePolicy.rateDatePrices) && ratePolicy.rateDatePrices.length > 0) {
            // If there are rate date prices, we'll calculate average in calculateAverageRatePrice
            hasRateOverride = true;
          }
          
          // Second priority: Calculate price using rate policy base price + room percentage adjustment
          if (ratePolicy.basePrice && ratePolicy.basePrice > 0) {
            const percentageAdjustment = roomRate.percentageAdjustment || 0;
            const adjustment = (ratePolicy.basePrice * percentageAdjustment) / 100;
            finalPrice = Math.round((ratePolicy.basePrice + adjustment) * 100) / 100;
          }

          options.push({
            id: roomRate.ratePolicy.id,
            name: roomRate.ratePolicy.name,
            description: roomRate.ratePolicy.description,
            price: finalPrice,
            isActive: roomRate.ratePolicy.isActive,
            refundable: roomRate.ratePolicy.refundable,
            fullPaymentDays: roomRate.ratePolicy.fullPaymentDays,
            prepayPercentage: roomRate.ratePolicy.prepayPercentage,
            changeAllowedDays: roomRate.ratePolicy.changeAllowedDays,
            rebookValidityDays: roomRate.ratePolicy.rebookValidityDays,
            paymentStructure: roomRate.ratePolicy.paymentStructure,
            cancellationPolicy: roomRate.ratePolicy.cancellationPolicy,
            adjustmentPercentage: roomRate.ratePolicy.adjustmentPercentage,
            type: 'policy',
            rateDatePrices: roomRate.ratePolicy.rateDatePrices || [],
            basePrice: ratePolicy.basePrice,
            percentageAdjustment: roomRate.percentageAdjustment
          });
        }
      });
    }

    return options;
  };

  const rateOptions = getRateOptions();

  function openGallery() {
    setCurrentImageIndex(0);
  }

  function prevImage(e: React.MouseEvent) {
    e.stopPropagation();
    setCurrentImageIndex(prev => Math.max(0, prev - 1));
  }

  function nextImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (selectedRoom.images) {
      setCurrentImageIndex(prev => Math.min(selectedRoom.images.length - 1, prev + 1));
    }
  }

  function toggleEnhancementDetails(enhancementId: string) {
    setEnhancementDetails((prev: any) => ({
      ...prev,
      [enhancementId]: !prev[enhancementId]
    }));
  }

  function addEnhancement(enhancement: any) {
    // Check if it's an event or a product
    if (enhancement.isEvent || enhancement.type === 'EVENT') {
      // Store full event details in array for UI using eventId as unique identifier
      setBookingData((prev: any) => ({
        ...prev,
        selectedEventsDetails: [
          ...(prev.selectedEventsDetails || []).filter((e: any) => e.eventId !== enhancement.eventId),
          { ...enhancement, plannedAttendees: 1 }
        ]
      }));
    } else {
      // Store in selectedEnhancements array with quantity
      const existingEnhancement = bookingData.selectedEnhancements.find((e: any) => e.id === enhancement.id);
      if (!existingEnhancement) {
        const enhancementWithQuantity = { ...enhancement, quantity: 1 };
        setBookingData((prev: any) => ({
          ...prev,
          selectedEnhancements: [...prev.selectedEnhancements, enhancementWithQuantity]
        }));
      }
    }
  }

  function removeEnhancement(enhancementId: string) {
    // Check if it's an event by looking in selectedEventsDetails
    const isEvent = bookingData.selectedEventsDetails?.some((e: any) => e.eventId === enhancementId);
    
    if (isEvent) {
      // Remove from event details array
      setBookingData((prev: any) => ({
        ...prev,
        selectedEventsDetails: (prev.selectedEventsDetails || []).filter((e: any) => e.eventId !== enhancementId)
      }));
    } else {
      // Remove from enhancements
      setBookingData((prev: any) => ({
        ...prev,
        selectedEnhancements: prev.selectedEnhancements.filter((e: any) => e.id !== enhancementId)
      }));
    }
  }

  function updateOccupancy(type: 'rooms' | 'adults', change: number) {
    if (type === 'rooms') {
      setRooms((prev: number) => Math.max(1, prev + change));
    } else {
      // Limit guest count to maximum available capacity across all rooms
      const newAdults = Math.max(1, Math.min(maxGuestCapacity, adults + change));
      
      // Update local state immediately for UI responsiveness
      setAdults(newAdults);
      
      // Update booking data state
      setBookingData((prev: any) => ({ ...prev, adults: newAdults }));
    }
  }

  function handleBookNow(rateOption: any, selectedPaymentStructure?: string) {
    
    // Calculate enhancement price based on pricing type
    const enhancementPrice = bookingData.selectedEnhancements.length > 0 
      ? bookingData.selectedEnhancements.reduce((acc: any, curr: any) => {
          let price = curr.price;
          
          // Handle different pricing types
          if (curr.pricingType === 'PER_GUEST') {
            // For per-guest pricing, multiply by quantity (number of guests selected)
            const quantity = curr.quantity || 1;
            price = curr.price * quantity;
          } else if (curr.pricingType === 'PER_DAY') {
            // For per-day pricing, multiply by number of nights
            price = curr.price * nights;
          } else {
            // For PER_BOOKING, price is fixed (no multiplication)
            price = curr.price;
          }
          
          return acc + price;
        }, 0) 
      : 0;
    
    // Calculate event price from selectedEventsDetails
    const eventPrice = (bookingData.selectedEventsDetails || []).reduce((acc: number, eventDetail: any) => {
      const price = eventDetail?.price || 0;
      const attendees = eventDetail.plannedAttendees || 1;
      return acc + (price * attendees);
    }, 0);
    
    // Calculate extra bed cost if applicable
    let extraBedCost = 0;
    if (extraBedConfig.useExtraBed && selectedRoom.extraBedPrice) {
      extraBedCost = extraBedConfig.extraBedCount * selectedRoom.extraBedPrice * nights * rooms;
    }
    
    // Calculate total rate cost with price breakdown
    const priceData = calculatePriceBreakdown(rateOption);
    let totalRateCost = priceData.totalPrice;
    
    // Apply adjustment percentage if present
    if (rateOption.adjustmentPercentage && rateOption.adjustmentPercentage !== 0) {
      const adjustmentFactor = 1 + (rateOption.adjustmentPercentage / 100);
      totalRateCost = totalRateCost * adjustmentFactor;
    }
    
    // Calculate total price including room, enhancements, events, and extra beds
    // Note: enhancementPrice already includes quantities and is calculated per booking type
    const totalPrice = totalRateCost * rooms + enhancementPrice + eventPrice + extraBedCost;
    
    const finalBookingData = {
      ...bookingData,
      selectedRateOption: rateOption,
      selectedPaymentStructure: selectedPaymentStructure || rateOption.paymentStructure || 'FULL_PAYMENT',
      rooms: rooms,
      adults: adults,
      totalPrice: totalPrice,
      selectedEventsDetails: bookingData.selectedEventsDetails, // For UI: array with full event details
      selectedEnhancements: bookingData.selectedEnhancements, // Keep only product enhancements
      hasExtraBed: extraBedConfig.useExtraBed,
      extraBedCount: extraBedConfig.extraBedCount,
      extraBedPrice: selectedRoom.extraBedPrice || 0
    };

    setBookingData(finalBookingData);
    
    setCurrentStep(4);
  }

  function handleSwitchToAlternativeRoom(roomId: string) {
    // Reset all related states when switching rooms
    setShowRoomAlternatives(false);
    setAlternativeRooms([]);
    setExtraBedConfig({ useExtraBed: false, extraBedCount: 0 });
    
    // Update booking data with new room
    setBookingData((prev: any) => ({ ...prev, selectedRoom: roomId }));
  }

  function toggleRateDetails(rateId: string) {
    setExpandedRateDetails(prev => ({
      ...prev,
      [rateId]: !prev[rateId]
    }));
  }

  return (
    <div>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="rounded-lg">
          <div className="py-6">
          <h2 className="rates-title text-center">Rates</h2>
        </div>
        <BookingSummary bookingData={bookingData} setCurrentStep={setCurrentStep} />
        
        {/* Room Display */}
        <div className="flex gap-2 sm:gap-4 p-2 sm:p-4">
          <div className="bg-white flex flex-col sm:flex-row rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md w-full">
            {/* Room image */}
            <div className="relative h-48 sm:h-64 overflow-hidden p-2 sm:p-3">
              {selectedRoom?.images?.length > 0 ? (
                <img
                  src={selectedRoom.images[currentImageIndex]?.url}
                  alt={selectedRoom.name}
                  className="w-full sm:w-96 rounded-md h-full object-cover transition-transform cursor-pointer"
                  onClick={openGallery}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No image available</div>
              )}

              {/* Image navigation */}
              {selectedRoom.images?.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    disabled={currentImageIndex === 0}
                    className={`cursor-pointer absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 sm:p-1.5 rounded-full transition-colors ${currentImageIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    disabled={currentImageIndex === selectedRoom.images.length - 1}
                    className={`cursor-pointer absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 sm:p-1.5 rounded-full transition-colors ${currentImageIndex === selectedRoom.images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                    {currentImageIndex + 1}/{selectedRoom.images.length}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex-1">
              <div className="p-3 sm:p-5 -mb-3 sm:-mb-6">
                <h3 className="rates-room-title">{selectedRoom.name}</h3>
              </div>

              <div className="p-3 sm:p-5">
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">Maximum persons: {selectedRoom.capacity}</span>

                  {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                    <div className="p-3 sm:p-5">
                      <div className=" flex flex-wrap gap-2 text-sm text-gray-600 space-y-0.5">
                        {selectedRoom.amenities.map((amenity: string, index: number) => (
                          <span key={index} className="bg-gray-100 px-2 py-1 rounded-md">{amenity}</span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>


                {isExpanded && <p className="text-gray-600 mb-3 text-sm sm:text-base">{selectedRoom.description}</p>}
                
                <div
                  className="flex items-center gap-1 text-gray-700 cursor-pointer mb-3"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-xs sm:text-sm font-medium">Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-xs sm:text-sm font-medium">More</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4">
          {/* Left Side - Enhancements (Original Large Screen Design) */}
          <div className={`${enhancements.length > 0 ? 'lg:flex-1' : 'hidden'} order-2 lg:order-1`}>
           {enhancements.length > 0 && <h3 className="rates-section-title mb-4 hidden lg:block">Enhance your stay</h3>}
           
           {/* Events Section - Desktop */}
           {events.length > 0 && (
             <div className="hidden lg:block mb-6">
               <div className="flex items-center gap-2 mb-3">
                 <h4 className="text-sm font-semibold text-gray-700">Special Events</h4>
                 <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-xs">During your stay (Italy time)</span>
               </div>
               <div className="space-y-4">
                 {events.map((enhancement: any) => {
                const eventFromDetails = bookingData.selectedEventsDetails?.find((e: any) => e.eventId === enhancement.eventId);
                const isAdded = !!eventFromDetails;
                const eventAttendance = eventFromDetails 
                  ? { plannedAttendees: eventFromDetails.plannedAttendees }
                  : { plannedAttendees: 1 };
                const maxGuests = enhancement.maxQuantity ?? bookingData.adults;

                return (
                  <div key={enhancement.eventId || enhancement.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <img 
                        src={enhancement.image} 
                        alt={enhancement.name || enhancement.title} 
                        className="w-full sm:w-20 h-32 sm:h-20 rounded-lg object-cover flex-shrink-0" 
                      />
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-2">{enhancement.name || enhancement.title}</h4>
                        {enhancement.enhancementName && (
                          <p className="text-sm text-blue-600 font-medium mb-1">{enhancement.enhancementName}</p>
                        )}
                        {enhancement.eventDate && (
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                              {format(new Date(enhancement.eventDate), 'EEEE, MMM dd, yyyy • h:mm a')}
                            </span>
                          </div>
                        )}
                        <p className="text-gray-600 text-xs sm:text-sm mb-3">{enhancement.description}</p>
                        
                        {enhancementDetails[enhancement.eventId || enhancement.id] && (
                            <div>
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <p className="text-xs sm:text-sm text-gray-700">Perfect for your {nights} night stay. Available during your selected dates.</p>
                              </div>
                              {/* Show availability details based on type */}
                              {enhancement.availabilityType === 'WEEKLY' && enhancement.availableDays && (
                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                  <span className="text-xs text-gray-500">Available on:</span>
                                  {enhancement.availableDays.map((item: string, index: number) => (
                                    <span key={index} className="text-gray-600 text-xs sm:text-sm">
                                      {item}{index < enhancement.availableDays.length - 1 ? ',' : ''}
                                    </span>
                                  ))}
                                  {enhancement.availableTimeStart && enhancement.availableTimeEnd && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({formatItalianTime(enhancement.availableTimeStart)} - {formatItalianTime(enhancement.availableTimeEnd)})
                                    </span>
                                  )}
                                </div>
                              )}
                              {enhancement.availabilityType === 'SPECIFIC_DATES' && (
                                <div className="text-xs sm:text-sm text-gray-600">
                                  <span className="text-gray-500">Special event during your stay</span>
                                  {enhancement.availableTimeStart && enhancement.availableTimeEnd && (
                                    <span className="ml-2">({formatItalianTime(enhancement.availableTimeStart)} - {formatItalianTime(enhancement.availableTimeEnd)})</span>
                                  )}
                                </div>
                              )}
                              {enhancement.availabilityType === 'SEASONAL' && (
                                <div className="text-xs sm:text-sm text-gray-600">
                                  <span className="text-gray-500">Seasonal offering available during your visit</span>
                                </div>
                              )}
                              {enhancement.availabilityType === 'ALWAYS' && (
                                <div className="text-xs sm:text-sm text-gray-600">
                                  <span className="text-gray-500">Available throughout your stay</span>
                                </div>
                              )}
                            </div>
                        )}
                        
                        <button
                          className="flex items-center text-gray-700 text-xs sm:text-sm mb-4 hover:text-gray-900 transition-colors cursor-pointer"
                          onClick={() => toggleEnhancementDetails(enhancement.eventId || enhancement.id)}
                        >
                          {enhancementDetails[enhancement.eventId || enhancement.id] ? (
                            <>less <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-1" /></>
                          ) : (
                            <>more <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" /></>
                          )}
                        </button>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-lg sm:text-xl font-bold text-gray-800">€{enhancement.price}</span>
                            <span className="text-gray-600 ml-1 text-sm">/ {enhancement.pricingType.toLowerCase().replace('_', ' ')}</span>
                          </div>
                          
                          {isAdded ? (
                            <button 
                              className="bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer text-sm w-full sm:w-auto"
                              onClick={() => removeEnhancement(enhancement.eventId || enhancement.id)}
                            >
                              Remove
                            </button>
                          ) : (
                            <button 
                              className="bg-gray-800 text-white px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors cursor-pointer text-sm w-full sm:w-auto"
                              onClick={() => addEnhancement(enhancement)}
                            >
                              Add
                            </button>
                          )}
                        </div>
                        
                        {/* Event Attendance Selector */}
                        {isAdded && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="text-sm font-medium text-gray-700">How many guests will attend?</label>
                                <p className="text-xs text-gray-500 mt-1">Max {maxGuests} guests in your party</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    const current = eventAttendance?.plannedAttendees || 1;
                                    if (current > 1) {
                                      const newAttendees = current - 1;
                                      // Update the array
                                      setBookingData((prev: any) => ({
                                        ...prev,
                                        selectedEventsDetails: (prev.selectedEventsDetails || []).map((e: any) => 
                                          e.eventId === enhancement.eventId ? { ...e, plannedAttendees: newAttendees } : e
                                        )
                                      }));
                                    }
                                  }}
                                  disabled={(eventAttendance?.plannedAttendees || 1) <= 1}
                                >
                                  <span className="text-gray-600">−</span>
                                </button>
                                <span className="w-12 text-center font-medium text-gray-800">
                                  {eventAttendance?.plannedAttendees || 1}
                                </span>
                                <button
                                  className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    const current = eventAttendance?.plannedAttendees || 1;
                                    const maxAllowed = enhancement.maxQuantity !== null && enhancement.maxQuantity !== undefined ? enhancement.maxQuantity : maxGuests;
                                    if (current < maxAllowed) {
                                      const newAttendees = current + 1;
                                      // Update the array
                                      setBookingData((prev: any) => ({
                                        ...prev,
                                        selectedEventsDetails: (prev.selectedEventsDetails || []).map((e: any) => 
                                          e.eventId === enhancement.eventId ? { ...e, plannedAttendees: newAttendees } : e
                                        )
                                      }));
                                    }
                                  }}
                                  disabled={(eventAttendance?.plannedAttendees || 1) >= (enhancement.maxQuantity !== null && enhancement.maxQuantity !== undefined ? enhancement.maxQuantity : maxGuests)}
                                >
                                  <span className="text-gray-600">+</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
               </div>
             </div>
           )}

           {/* Products Section - Desktop */}
           {products.length > 0 && (
             <div className="hidden lg:block">
               <div className="flex items-center gap-2 mb-3">
                 <h4 className="text-sm font-semibold text-gray-700">Additional Products</h4>
                 <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-xs">Enhance your comfort</span>
               </div>
               <div className="space-y-4">
                 {products.map((enhancement: any) => {
                   const existingEnhancement = bookingData.selectedEnhancements.find((e: any) => e.id === enhancement.id);
                   const isAdded = !!existingEnhancement;
                   const productQuantity = existingEnhancement?.quantity || 0;
                   return (
                     <div key={enhancement.eventId || enhancement.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                       <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                         <img 
                           src={enhancement.image} 
                           alt={enhancement.title || enhancement.name} 
                           className="w-full sm:w-20 h-32 sm:h-20 rounded-lg object-cover flex-shrink-0" 
                         />
                         <div className="flex-1">
                           <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-2">{enhancement.title || enhancement.name}</h4>
                           <p className="text-gray-600 text-xs sm:text-sm mb-3">{enhancement.description}</p>
                           
                           {enhancementDetails[enhancement.eventId || enhancement.id] && (
                               <div>
                                 <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                   <p className="text-xs sm:text-sm text-gray-700">Perfect for your {nights} night stay. Available during your selected dates.</p>
                                 </div>
                                 {/* Show availability details based on type */}
                                 {enhancement.availabilityType === 'WEEKLY' && enhancement.availableDays && (
                                   <div className="flex flex-wrap gap-1 sm:gap-2">
                                     <span className="text-xs text-gray-500">Available on:</span>
                                     {enhancement.availableDays.map((item: string, index: number) => (
                                       <span key={index} className="text-gray-600 text-xs sm:text-sm">
                                         {item}{index < enhancement.availableDays.length - 1 ? ',' : ''}
                                       </span>
                                     ))}
                                   </div>
                                 )}
                                 {enhancement.availabilityType === 'ALWAYS' && (
                                   <div className="text-xs sm:text-sm text-gray-600">
                                     <span className="text-gray-500">Available throughout your stay</span>
                                   </div>
                                 )}
                               </div>
                           )}
                           
                           <button
                             className="flex items-center text-gray-700 text-xs sm:text-sm mb-4 hover:text-gray-900 transition-colors cursor-pointer"
                             onClick={() => toggleEnhancementDetails(enhancement.eventId || enhancement.id)}
                           >
                             {enhancementDetails[enhancement.eventId || enhancement.id] ? (
                               <>less <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 ml-1" /></>
                             ) : (
                               <>more <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" /></>
                             )}
                           </button>
                           
                           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                             <div>
                               <span className="text-lg sm:text-xl font-bold text-gray-800">€{enhancement.price}</span>
                               <span className="text-gray-600 ml-1 text-sm">
                                 {enhancement.pricingType === 'PER_GUEST' && '/ per guest'}
                                 {enhancement.pricingType === 'PER_DAY' && `/ per day (€${enhancement.price * nights} for ${nights} nights)`}
                                 {enhancement.pricingType === 'PER_BOOKING' && '/ per booking'}
                               </span>
                             </div>
                             {isAdded ? (
                               <button 
                                 className="bg-red-600 text-white px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer text-sm w-full sm:w-auto"
                                 onClick={() => removeEnhancement(enhancement.eventId || enhancement.id)}
                               >
                                 Remove
                               </button>
                             ) : (
                               <button 
                                 className="bg-gray-800 text-white px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors cursor-pointer text-sm w-full sm:w-auto"
                                 onClick={() => addEnhancement(enhancement)}
                               >
                                 Add
                               </button>
                             )}
                           </div>
                           
                           {/* Product Quantity Selector - Only show for PER_GUEST pricing */}
                           {isAdded && enhancement.pricingType === 'PER_GUEST' && (
                             <div className="mt-4 pt-4 border-t border-gray-200">
                               <div className="flex items-center justify-between">
                                 <div>
                                   <label className="text-sm font-medium text-gray-700">Number of Guests</label>
                                   <p className="text-xs text-gray-500 mt-1">Max {adults} guests in your party</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <button
                                     className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                     onClick={() => {
                                       if (productQuantity > 1) {
                                         const newQuantity = productQuantity - 1;
                                          setBookingData((prev: any) => {
                                           const updatedEnhancements = prev.selectedEnhancements.map((e: any) => 
                                             e.id === enhancement.id ? { ...e, quantity: newQuantity } : e
                                           );
                                           console.log('Desktop: Updating quantity to', newQuantity, 'for', enhancement.name);
                                           return {
                                             ...prev,
                                             selectedEnhancements: updatedEnhancements,
                                               [enhancement.id]: { quantity: newQuantity }
                                             }
                                         });
                                       }
                                     }}
                                     disabled={productQuantity <= 1}
                                   >
                                     <span className="text-gray-600">−</span>
                                   </button>
                                   <span className="w-12 text-center font-medium text-gray-800">
                                     {productQuantity}
                                   </span>
                                   <button
                                     className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                     onClick={() => {
                                       if (productQuantity < adults) {
                                         const newQuantity = productQuantity + 1;
                                       // Update the array too - ensure proper state update
                                       setBookingData((prev: any) => {
                                         const updatedEnhancements = prev.selectedEnhancements.map((e: any) => 
                                           e.id === enhancement.id ? { ...e, quantity: newQuantity } : e
                                         );
                                         return {
                                           ...prev,
                                           selectedEnhancements: updatedEnhancements,
                                             [enhancement.id]: { quantity: newQuantity }
                                           }
                                       });
                                       }
                                     }}
                                     disabled={productQuantity >= adults}
                                   >
                                     <span className="text-gray-600">+</span>
                                   </button>
                                 </div>
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

          </div>

          {/* Right Side - Occupancy and Rates */}
          <div className="lg:w-1/2 space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* Occupancy Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
              <h3 className="rates-section-title mb-4 text-center">Occupancy</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room 1:</label>
                  <div className="ml-2 sm:ml-4">
                    <label className="block text-sm text-gray-600 mb-1">Adults</label>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 sm:px-4 py-3">
                      <button 
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors cursor-pointer"
                        onClick={() => updateOccupancy('adults', -1)}
                        disabled={adults <= 1}
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <span className="font-semibold text-base sm:text-lg">{adults}</span>
                      <button 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors ${
                          adults >= maxGuestCapacity 
                            ? 'bg-gray-200 cursor-not-allowed opacity-50' 
                            : 'bg-gray-300 hover:bg-gray-400 cursor-pointer'
                        }`}
                        onClick={() => updateOccupancy('adults', 1)}
                        disabled={adults >= maxGuestCapacity}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                    
                    {/* Capacity status indicators */}
                    {adults >= maxGuestCapacity && (
                      <p className="text-xs text-red-600 mt-1">
                        Maximum capacity ({maxGuestCapacity} guests)
                      </p>
                    )}
                    
                    {adults > selectedRoom.capacity && !extraBedConfig.useExtraBed && !showRoomAlternatives && adults < maxGuestCapacity && (
                      <p className="text-xs text-red-600 mt-1">
                        Exceeds room capacity ({selectedRoom.capacity} guests)
                      </p>
                    )}
                    
                    {extraBedConfig.useExtraBed && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-blue-800">Extra Bed Added</span>
                        </div>
                        <p className="text-xs text-blue-700">
                          {extraBedConfig.extraBedCount} extra bed{extraBedConfig.extraBedCount > 1 ? 's' : ''} for {adults - selectedRoom.capacity} additional guest{adults - selectedRoom.capacity > 1 ? 's' : ''}
                        </p>
                        {selectedRoom.extraBedPrice && (
                          <p className="text-xs text-blue-600 mt-1">
                            +€{(extraBedConfig.extraBedCount * selectedRoom.extraBedPrice * nights).toFixed(2)} total
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Room Alternatives Section */}
            {showRoomAlternatives && alternativeRooms.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-amber-200">
                <h3 className="rates-section-title mb-4 text-amber-800">Alternative Rooms Available</h3>
                <p className="text-sm text-amber-700 mb-4">
                  {extraBedConfig.useExtraBed 
                    ? `Your current room "${selectedRoom.name}" can accommodate ${adults} guests with extra beds. Here are other room options:`
                    : `Your current room "${selectedRoom.name}" has a capacity of ${selectedRoom.capacity} guests. Here are rooms that can accommodate ${adults} guests:`
                  }
                </p>
                
                <div className="space-y-3">
                  {alternativeRooms.map((room: any) => {
                    const needsExtraBed = adults > room.capacity;
                    const extraBedsNeeded = needsExtraBed ? adults - room.capacity : 0;
                    const extraBedCost = needsExtraBed && room.extraBedPrice ? extraBedsNeeded * room.extraBedPrice * nights : 0;
                    
                    return (
                      <div key={room.id} className="border border-gray-200 rounded-lg p-4 hover:border-amber-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{room.name}</h4>
                            <div className="text-sm text-gray-600 mt-1">
                              <p>Capacity: {room.capacity} guests</p>
                              {needsExtraBed && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-amber-700">
                                    +{extraBedsNeeded} extra bed{extraBedsNeeded > 1 ? 's' : ''} needed
                                  </p>
                                  {room.extraBedPrice && (
                                    <p className="text-amber-600">
                                      Extra bed cost: €{extraBedCost.toFixed(2)} total
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="mt-2">
                              <span className="text-lg font-semibold text-gray-900">
                                €{room.price.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500"> per night</span>
                              {extraBedCost > 0 && (
                                <span className="text-sm text-amber-600 ml-2">
                                  (+ €{room.extraBedPrice.toFixed(2)}/night per extra bed)
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleSwitchToAlternativeRoom(room.id) }
                            className="ml-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                          >
                            Select Room
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Keep current room:</strong> 
                    {extraBedConfig.useExtraBed 
                      ? ` You can continue with "${selectedRoom.name}" which will accommodate ${adults} guests using ${extraBedConfig.extraBedCount} extra bed${extraBedConfig.extraBedCount > 1 ? 's' : ''}.`
                      : ` The current room "${selectedRoom.name}" cannot accommodate ${adults} guests with its standard capacity of ${selectedRoom.capacity}.`
                    }
                  </p>
                </div>
              </div>
            )}

 {/* Mobile Compact Enhancement Design */}
 {enhancements.length > 0 && (
            <div className="lg:hidden bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-4">
              <h3 className="rates-section-title mb-3">Enhance your stay</h3>
              
              {/* Mobile Events Section */}
              {events.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Events</h4>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">Italy time</span>
                  </div>
                  <div className="space-y-3">
                    {events.map((enhancement: any) => {
                  const eventFromDetails = bookingData.selectedEventsDetails?.find((e: any) => e.eventId === enhancement.eventId);
                  const isAdded = !!eventFromDetails;
                  const eventAttendance = eventFromDetails 
                    ? { plannedAttendees: eventFromDetails.plannedAttendees }
                    : { plannedAttendees: 1 };
                  const maxGuests = bookingData.adults;
                  
                  return (
                    <div key={enhancement.eventId || enhancement.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Small thumbnail for mobile */}
                        <img 
                          src={enhancement.image} 
                          alt={enhancement.name || enhancement.title} 
                          className="w-12 h-12 rounded-md object-cover flex-shrink-0" 
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 leading-tight">{enhancement.name || enhancement.title}</h4>
                          {enhancement.enhancementName && (
                            <p className="text-xs text-blue-600 font-medium">{enhancement.enhancementName}</p>
                          )}
                          {enhancement.eventDate && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-700">
                                {format(new Date(enhancement.eventDate), 'MMM dd • h:mm a')}
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{enhancement.description}</p>
                          
                          {/* Price and action in one line on mobile */}
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-gray-800">€{enhancement.price}</span>
                              <span className="text-xs text-gray-600">/ {enhancement.pricingType.toLowerCase().replace('_', ' ')}</span>
                            </div>
                            
                            {isAdded ? (
                              <button 
                                className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-medium hover:bg-red-200 transition-colors cursor-pointer"
                                onClick={() => removeEnhancement(enhancement.eventId || enhancement.id)}
                              >
                                Remove
                              </button>
                            ) : (
                              <button 
                                className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                                onClick={() => addEnhancement(enhancement)}
                              >
                                Add
                              </button>
                            )}
                          </div>
                          
                          {/* Event Attendance Selector for Mobile */}
                          {isAdded && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-gray-700">Attendees</span>
                                  <p className="text-xs text-gray-500">Max {maxGuests}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const current = eventAttendance?.plannedAttendees || 1;
                                      if (current > 1) {
                                        const newAttendees = current - 1;
                                        // Update the array
                                        setBookingData((prev: any) => ({
                                          ...prev,
                                          selectedEventsDetails: (prev.selectedEventsDetails || []).map((e: any) => 
                                            e.eventId === enhancement.eventId ? { ...e, plannedAttendees: newAttendees } : e
                                          )
                                        }));
                                      }
                                    }}
                                    disabled={(eventAttendance?.plannedAttendees || 1) <= 1}
                                  >
                                    −
                                  </button>
                                  <span className="w-8 text-center text-sm font-medium">
                                    {eventAttendance?.plannedAttendees || 1}
                                  </span>
                                  <button
                                    className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const current = eventAttendance?.plannedAttendees || 1;
                                      if (current < maxGuests) {
                                        const newAttendees = current + 1;
                                        // Update the array
                                        setBookingData((prev: any) => ({
                                          ...prev,
                                          selectedEventsDetails: (prev.selectedEventsDetails || []).map((e: any) => 
                                            e.eventId === enhancement.eventId ? { ...e, plannedAttendees: newAttendees } : e
                                          )
                                        }));
                                      }
                                    }}
                                    disabled={(eventAttendance?.plannedAttendees || 1) >= (enhancement.maxQuantity !== null && enhancement.maxQuantity !== undefined ? enhancement.maxQuantity : maxGuests)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Expandable details for mobile */}
                          {enhancementDetails[enhancement.eventId || enhancement.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="bg-gray-50 rounded-md p-2 mb-2">
                                <p className="text-xs text-gray-700">Available during your {nights} night stay</p>
                              </div>
                              {/* Show availability details based on type */}
                              {enhancement.availabilityType === 'WEEKLY' && enhancement.availableDays && (
                                <div className="flex flex-wrap gap-1">
                                  {enhancement.availableDays.map((item: string, index: number) => (
                                    <span key={index} className="text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                                      {item}
                                    </span>
                                  ))}
                                  {enhancement.availableTimeStart && enhancement.availableTimeEnd && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      {formatItalianTime(enhancement.availableTimeStart)}-{formatItalianTime(enhancement.availableTimeEnd)}
                                    </span>
                                  )}
                                </div>
                              )}
                              {enhancement.availabilityType === 'SPECIFIC_DATES' && (
                                <p className="text-xs text-gray-600">
                                  Special event
                                  {enhancement.availableTimeStart && enhancement.availableTimeEnd && (
                                    <span className="ml-1">({formatItalianTime(enhancement.availableTimeStart)}-{formatItalianTime(enhancement.availableTimeEnd)})</span>
                                  )}
                                </p>
                              )}
                              {enhancement.availabilityType === 'SEASONAL' && (
                                <p className="text-xs text-gray-600">Seasonal offering</p>
                              )}
                              {enhancement.availabilityType === 'ALWAYS' && (
                                <p className="text-xs text-gray-600">Always available</p>
                              )}
                            </div>
                          )}
                          
                          <button
                            className="flex items-center text-gray-500 text-xs mt-2 hover:text-gray-700 transition-colors cursor-pointer"
                            onClick={() => toggleEnhancementDetails(enhancement.eventId || enhancement.id)}
                          >
                            {enhancementDetails[enhancement.eventId || enhancement.id] ? (
                              <>Hide details <ChevronUp className="h-3 w-3 ml-1" /></>
                            ) : (
                              <>Show details <ChevronDown className="h-3 w-3 ml-1" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              )}

              {/* Mobile Products Section */}
              {products.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Products</h4>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Enhance comfort</span>
                  </div>
                  <div className="space-y-3">
                    {products.map((enhancement: any) => {
                      const existingEnhancement = bookingData.selectedEnhancements.find((e: any) => e.id === enhancement.id);
                      const isAdded = !!existingEnhancement;
                      const productQuantity = existingEnhancement?.quantity || 0;
                      return (
                        <div key={enhancement.eventId || enhancement.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                          <div className="flex items-start gap-3">
                            {/* Small thumbnail for mobile */}
                            <img 
                              src={enhancement.image} 
                              alt={enhancement.title || enhancement.name} 
                              className="w-12 h-12 rounded-md object-cover flex-shrink-0" 
                            />
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-800 leading-tight">{enhancement.title || enhancement.name}</h4>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{enhancement.description}</p>
                              
                              {/* Price and action in one line on mobile */}
                              <div className="flex items-center justify-between mt-2 gap-2">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-gray-800">€{enhancement.price}</span>
                                  <span className="text-xs text-gray-600">
                                    {enhancement.pricingType === 'PER_GUEST' && '/ guest'}
                                    {enhancement.pricingType === 'PER_DAY' && `/ day`}
                                    {enhancement.pricingType === 'PER_BOOKING' && '/ booking'}
                                  </span>
                                </div>
                                
                                {isAdded ? (
                                  <button 
                                    className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-medium hover:bg-red-200 transition-colors cursor-pointer"
                                    onClick={() => removeEnhancement(enhancement.eventId || enhancement.id)}
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <button 
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                                    onClick={() => addEnhancement(enhancement)}
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                              
                              {/* Product Quantity Selector for Mobile - Only show for PER_GUEST pricing */}
                              {isAdded && enhancement.pricingType === 'PER_GUEST' && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <span className="text-xs font-medium text-gray-700">Guests</span>
                                      <p className="text-xs text-gray-500">Max {bookingData.adults}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (productQuantity > 1) {
                                            const newQuantity = productQuantity - 1;
                                            setBookingData((prev: any) => {
                                              const updatedEnhancements = prev.selectedEnhancements.map((e: any) => 
                                                e.id === enhancement.id ? { ...e, quantity: newQuantity } : e
                                              );
                                              console.log('Mobile: Updating quantity to', newQuantity, 'for', enhancement.name);
                                              return {
                                                ...prev,
                                                selectedEnhancements: updatedEnhancements,
                                                  [enhancement.id]: { quantity: newQuantity }
                                                }
                                            });
                                          }
                                        }}
                                        disabled={productQuantity <= 1}
                                      >
                                        −
                                      </button>
                                      <span className="w-8 text-center text-sm font-medium">
                                        {productQuantity}
                                      </span>
                                      <button
                                        className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (productQuantity < bookingData.adults) {
                                            const newQuantity = productQuantity + 1;
                                            setBookingData((prev: any) => {
                                              const updatedEnhancements = prev.selectedEnhancements.map((e: any) => 
                                                e.id === enhancement.id ? { ...e, quantity: newQuantity } : e
                                              );
                                              console.log('Mobile: Updating quantity to', newQuantity, 'for', enhancement.name);
                                              return {
                                                ...prev,
                                                selectedEnhancements: updatedEnhancements,
                                                  [enhancement.id]: { quantity: newQuantity }
                                                }
                                            });
                                          }
                                        }}
                                        disabled={productQuantity >= bookingData.adults}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Expandable details for mobile */}
                              {enhancementDetails[enhancement.eventId || enhancement.id] && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="bg-gray-50 rounded-md p-2 mb-2">
                                    <p className="text-xs text-gray-700">Available for your {nights} night stay</p>
                                  </div>
                                  {enhancement.availabilityType === 'ALWAYS' && (
                                    <p className="text-xs text-gray-600">Always available</p>
                                  )}
                                </div>
                              )}
                              
                              <button
                                className="flex items-center text-gray-500 text-xs mt-2 hover:text-gray-700 transition-colors cursor-pointer"
                                onClick={() => toggleEnhancementDetails(enhancement.eventId || enhancement.id)}
                              >
                                {enhancementDetails[enhancement.eventId || enhancement.id] ? (
                                  <>Hide details <ChevronUp className="h-3 w-3 ml-1" /></>
                                ) : (
                                  <>Show details <ChevronDown className="h-3 w-3 ml-1" /></>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
           )}
            {/* All Rate Options */}
            <div className="space-y-4">
              <h3 className="rates-section-title">Available Rates</h3>
            
            {rateOptions.map((rateOption: any) => {
              // Calculate price breakdown for all nights
              const priceData = calculatePriceBreakdown(rateOption);
              const totalRateCost = priceData.totalPrice;
              const averagePrice = priceData.averagePrice;
              
              // Apply adjustment percentage if present (-40% would reduce the price)
              let adjustedTotalCost = totalRateCost;
              let adjustedAveragePrice = averagePrice;
              
              if (rateOption.adjustmentPercentage && rateOption.adjustmentPercentage !== 0) {
                const adjustmentFactor = 1 + (rateOption.adjustmentPercentage / 100);
                adjustedTotalCost = totalRateCost * adjustmentFactor;
                adjustedAveragePrice = averagePrice * adjustmentFactor;
              }
              
              const basePrice = adjustedTotalCost * rooms;
              const extraBedCost = extraBedConfig.useExtraBed && selectedRoom.extraBedPrice ? 
                extraBedConfig.extraBedCount * selectedRoom.extraBedPrice * nights * rooms : 0;
              const totalPrice = basePrice + extraBedCost;
              
              return (
                <div key={rateOption.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Rate Header */}
                  <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-gray-800">
                          {rateOption.name}
                        </h4>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {rateOption.paymentStructure === 'SPLIT_PAYMENT' && (
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                            Split Payment
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {rateOption.description}
                    </p>
                  </div>

                  {/* Rate Body */}
                  <div className="p-3 sm:p-4">
                    {/* Pricing Display */}
                    <div className="space-y-2 sm:space-y-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-base sm:text-lg font-bold text-gray-800">€{adjustedAveragePrice.toFixed(2)}</span>
                        <span className="text-xs sm:text-sm text-gray-600">avg per night</span>
                      </div>
                      
                      {/* Price variations indicator */}
                      {priceData.breakdown.some(day => day.isOverride) && (
                        <button
                          onClick={() => toggleRateDetails(rateOption.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>View price breakdown</span>
                          {expandedRateDetails[rateOption.id] ? 
                            <ChevronUp className="h-3 w-3" /> : 
                            <ChevronDown className="h-3 w-3" />
                          }
                        </button>
                      )}
                      
                      {/* Expandable price breakdown */}
                      {expandedRateDetails[rateOption.id] && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 space-y-2">
                          <h5 className="text-sm font-semibold text-gray-700">Daily Price Breakdown:</h5>
                          <div className="space-y-1">
                            {priceData.breakdown.map((day, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {format(new Date(day.date), 'EEE, MMM dd')}
                                  {day.isOverride && <span className="text-xs text-blue-600 ml-1">(Special Rate)</span>}
                                </span>
                                <span className={`font-medium ${day.isOverride ? 'text-blue-700' : 'text-gray-700'}`}>
                                  €{day.price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            
                            {/* Show adjustment if applied */}
                            {(() => {
                              const hasAdjustment = rateOption.adjustmentPercentage && rateOption.adjustmentPercentage !== 0 && rateOption.adjustmentPercentage !== null;
                              
                              const totalRow = (
                                <div className="flex justify-between text-sm font-bold text-gray-800 pt-1">
                                  <span>Total for {nights} nights:</span>
                                  <span>€{adjustedTotalCost.toFixed(2)}</span>
                                </div>
                              );
                            
                              return hasAdjustment ? (
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal:</span>
                                    <span>€{totalRateCost.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm text-blue-700">
                                    <span>
                                      Rate adjustment ({rateOption.adjustmentPercentage > 0 ? '+' : ''}{rateOption.adjustmentPercentage}%):
                                    </span>
                                    <span>
                                      {rateOption.adjustmentPercentage > 0 ? '+' : ''}€{(adjustedTotalCost - totalRateCost).toFixed(2)}
                                    </span>
                                  </div>
                                  {totalRow}
                                </div>
                              ) : totalRow;
                            })()}
                          </div>
                        </div>
                      )}
                      
                      {/* Extra bed pricing breakdown */}
                      {extraBedCost > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                          <h5 className="text-sm font-semibold text-blue-800">Extra Bed Charges</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-blue-700">
                              <span>Room rate ({nights} nights):</span>
                              <span>€{basePrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-blue-700">
                              <span>Extra beds ({extraBedConfig.extraBedCount} × €{selectedRoom.extraBedPrice} × {nights} nights):</span>
                              <span>€{extraBedCost.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-base sm:text-lg font-semibold text-gray-700 border-t pt-2 gap-1 sm:gap-0">
                        <span className="text-sm sm:text-base">Total ({nights} nights, {rooms} room{rooms > 1 ? 's' : ''}):</span>
                        <span className="text-lg sm:text-xl font-bold text-gray-900">€{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Policy Information */}
                    <div className="space-y-2 mb-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-gray-600 flex-shrink-0" />
                        <span className={`px-2 py-1 rounded font-medium text-xs ${rateOption.refundable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {rateOption.refundable ? 'Refundable' : 'Non-refundable'}
                        </span>
                      </div>
                      
                      {/* Cancellation Policy */}
                      {rateOption.cancellationPolicy && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs capitalize">
                            {rateOption.cancellationPolicy.toLowerCase().replace('_', ' ')} cancellation
                          </span>
                        </div>
                      )}
                      
                      {rateOption.fullPaymentDays && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <Clock className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="text-xs">Final payment due {rateOption.fullPaymentDays} days before arrival</span>
                        </div>
                      )}
                      
                      {rateOption.changeAllowedDays && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <svg className="h-3 w-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="text-xs">Changes allowed up to {rateOption.changeAllowedDays} days before arrival</span>
                        </div>
                      )}

                    </div>

                    {/* Payment Structure Information */}
                    {rateOption.paymentStructure === 'SPLIT_PAYMENT' && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h5 className="text-sm font-semibold text-blue-800 mb-2">Split Payment Plan</h5>
                        <div className="space-y-2">
                          {(() => {
                            const prepayPercent = rateOption.prepayPercentage || 30; // fallback to 30% if not set
                            const remainingPercent = 100 - prepayPercent;
                            const prepayDecimal = prepayPercent / 100;
                            const remainingDecimal = remainingPercent / 100;
                            
                            return (
                              <>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  <span className="text-sm text-blue-700">
                                    Pay {prepayPercent}% now (€{(totalPrice * prepayDecimal).toFixed(2)})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                  <span className="text-sm text-blue-700">
                                    Pay {remainingPercent}% later (€{(totalPrice * remainingDecimal).toFixed(2)})
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        {rateOption.fullPaymentDays && (
                          <p className="text-xs text-blue-600 mt-2">
                            Remaining amount due {rateOption.fullPaymentDays} days before arrival
                          </p>
                        )}
                      </div>
                    )}

                    {/* Book Now Button */}
                    <button 
                      className="w-full py-2 sm:py-3 rounded-lg font-semibold transition-colors cursor-pointer text-sm sm:text-base bg-gray-900 hover:bg-gray-800 text-white"
                      onClick={() => {
                        const paymentStructure = rateOption.paymentStructure === 'SPLIT_PAYMENT' 
                          ? (selectedPaymentStructures[rateOption.id] || 'SPLIT_PAYMENT')
                          : 'FULL_PAYMENT';
                        handleBookNow(rateOption, paymentStructure);
                      }}
                    >
                      {(() => {
                        if (rateOption.paymentStructure === 'SPLIT_PAYMENT' && 
                            (selectedPaymentStructures[rateOption.id] === 'SPLIT_PAYMENT' || !selectedPaymentStructures[rateOption.id])) {
                          const prepayPercent = rateOption.prepayPercentage || 30;
                          const prepayDecimal = prepayPercent / 100;
                          return `Pay ${prepayPercent}% Now - €${(totalPrice * prepayDecimal).toFixed(2)}`;
                        }
                        return `Book This Rate - €${totalPrice.toFixed(2)}`;
                      })()}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}