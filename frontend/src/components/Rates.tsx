/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import BookingSummary from "./BookingSummary";
import { baseUrl } from "../utils/constants";
import { format } from "date-fns";
import type { Enhancement } from "../types/types";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, User, Plus, Minus, Tag, Shield, Clock } from "lucide-react";

export default function Rates({ bookingData, setCurrentStep, availabilityData, setBookingData }: { bookingData: any, setCurrentStep: (step: number) => void, availabilityData: any, setBookingData: any }) {

  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const formattedCheckIn = format(new Date(bookingData.checkIn), "yyyy-MM-dd");
  const formattedCheckOut = format(new Date(bookingData.checkOut), "yyyy-MM-dd");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const selectedRoom = availabilityData.availableRooms.find((room: any) => room.id === bookingData.selectedRoom);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [enhancementDetails, setEnhancementDetails] = useState<any>({});
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(bookingData.adults || 2);

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

  // Calculate nights
  const checkInDate = new Date(bookingData.checkIn);
  const checkOutDate = new Date(bookingData.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  // Handle guest capacity validation on component load
  useEffect(() => {
    if (selectedRoom && bookingData.adults > selectedRoom.capacity) {
      const newAdults = selectedRoom.capacity;
      setAdults(newAdults);
      setBookingData((prev: any) => ({ ...prev, adults: newAdults }));
    }
  }, [selectedRoom, bookingData.adults]);

  // Prepare rate options
  const getRateOptions = () => {
    const options = [];
    
    // Base rate (always available)
    const basePrice = selectedRoom?.price || 0;
    options.push({
      id: 'base',
      name: 'Standard Rate',
      description: 'Our standard room rate with all basic amenities included',
      price: basePrice,
      discountPercentage: 0,
      isActive: true,
      refundable: true,
      type: 'base'
    });

    // Room rates (if available)
    if (selectedRoom?.RoomRate && selectedRoom.RoomRate.length > 0) {
      selectedRoom.RoomRate.forEach((roomRate: any) => {
        if (roomRate.ratePolicy.isActive) {
          let finalPrice = basePrice;
          
          // Apply discount if available
          if (roomRate.ratePolicy.discountPercentage) {
            finalPrice = basePrice * (1 - roomRate.ratePolicy.discountPercentage / 100);
          }
          
          // Use nightly rate if specified
          if (roomRate.ratePolicy.nightlyRate) {
            finalPrice = roomRate.ratePolicy.nightlyRate;
          }

          options.push({
            id: roomRate.ratePolicy.id,
            name: roomRate.ratePolicy.name,
            description: roomRate.ratePolicy.description,
            price: finalPrice,
            discountPercentage: roomRate.ratePolicy.discountPercentage || 0,
            isActive: roomRate.ratePolicy.isActive,
            refundable: roomRate.ratePolicy.refundable,
            fullPaymentDays: roomRate.ratePolicy.fullPaymentDays,
            prepayPercentage: roomRate.ratePolicy.prepayPercentage,
            changeAllowedDays: roomRate.ratePolicy.changeAllowedDays,
            rebookValidityDays: roomRate.ratePolicy.rebookValidityDays,
            type: 'special'
          });
        }
      });
    }

    return options;
  };

  const rateOptions = getRateOptions();

  async function fetchEnhancements() {
    try {
        const res = await fetch(baseUrl + `/enhancements`, {
            method: "POST",
            body: JSON.stringify({
                days: daysInRange
            }),
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
        const data = await res.json();
        setEnhancements(data.data);
    } catch (error) {
        console.log(error);
    }
  }

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
    const existingEnhancement = bookingData.selectedEnhancements.find((e: any) => e.id === enhancement.id);
    if (!existingEnhancement) {
      setBookingData((prev: any) => ({
        ...prev,
        selectedEnhancements: [...prev.selectedEnhancements, enhancement]
      }));
    }
  }

  function removeEnhancement(enhancementId: string) {
    setBookingData((prev: any) => ({
      ...prev,
      selectedEnhancements: prev.selectedEnhancements.filter((e: any) => e.id !== enhancementId)
    }));
  }

  function updateOccupancy(type: 'rooms' | 'adults', change: number) {
    if (type === 'rooms') {
      setRooms((prev: number) => Math.max(1, prev + change));
    } else {
      const newAdults = Math.max(1, adults + change);
      if (newAdults <= selectedRoom.capacity) {
        setAdults(newAdults);
        setBookingData((prev: any) => ({ ...prev, adults: newAdults }));
      }
    }
  }

  function handleBookNow(rateOption: any) {
    const enhancementPrice = bookingData.selectedEnhancements.length > 1  ? bookingData.selectedEnhancements?.reduce((acc: any, curr: any) => acc.price + curr.price + 0) : 0;
    
    setBookingData((prev: any) => ({
      ...prev,
      selectedRateOption: rateOption,
      rooms: rooms,
      adults: adults,
      totalPrice: rateOption.price * nights * rooms + enhancementPrice * bookingData.adults
    }));
    setTimeout(() => {
        setCurrentStep(4);
    }, 20)
  }

  useEffect(() => {
    fetchEnhancements();
  }, [bookingData.checkIn, bookingData.checkOut])

  return (
    <div>
      <div className="container mx-auto px-2 sm:px-4">
        <div className="rounded-lg">
          <div className="py-6">
          <h2 className="text-2xl font-semibold text-center text-gray-800">Rates</h2>
        </div>
        <BookingSummary bookingData={bookingData} setCurrentStep={setCurrentStep} />
        
        {/* Room Display */}
        <div className="flex gap-2 sm:gap-4 p-2 sm:p-4">
          <div className="bg-white flex flex-col sm:flex-row rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md w-full">
            {/* Room image */}
            <div className="relative h-48 sm:h-64 overflow-hidden p-2 sm:p-3">
              {selectedRoom.images?.length > 0 ? (
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
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{selectedRoom.name}</h3>
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
           {enhancements.length > 0 && <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 hidden lg:block">Enhance your stay</h3>}
           
          

           {/* Original Large Screen Enhancement Design */}
            <div className="space-y-4 hidden lg:block">
              {enhancements.map((enhancement: any) => {
                const isAdded = bookingData.selectedEnhancements.some((e: any) => e.id === enhancement.id);
                return (
                  <div key={enhancement.id} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <img 
                        src={enhancement.image} 
                        alt={enhancement.title} 
                        className="w-full sm:w-20 h-32 sm:h-20 rounded-lg object-cover flex-shrink-0" 
                      />
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-2">{enhancement.title}</h4>
                        <p className="text-gray-600 text-xs sm:text-sm mb-3">{enhancement.description}</p>
                        
                        {enhancementDetails[enhancement.id] && (
                            <div>
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <p className="text-xs sm:text-sm text-gray-700">Perfect for your {nights} night stay. Available during your selected dates.</p>
                              </div>
                              <div className="flex flex-wrap gap-1 sm:gap-2">
                                   {enhancement.availableDays.map((item: string, index: number) => 
                                      (
                                        <span key={index} className="text-gray-600 text-xs sm:text-sm">
                                            {item}{index < enhancement.availableDays.length - 1 ? ',' : ''}
                                        </span>
                                      )
                                    )}   
                              </div>
                            </div>
                        )}
                        
                        <button
                          className="flex items-center text-gray-700 text-xs sm:text-sm mb-4 hover:text-gray-900 transition-colors cursor-pointer"
                          onClick={() => toggleEnhancementDetails(enhancement.id)}
                        >
                          {enhancementDetails[enhancement.id] ? (
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
                              onClick={() => removeEnhancement(enhancement.id)}
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Enhancements for Large Screen */}
            {bookingData.selectedEnhancements?.length > 0 && (
              <div className="mt-6 hidden lg:block">
                <h4 className="text-base sm:text-lg font-semibold mb-3 text-gray-800">Added Enhancements</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  {bookingData.selectedEnhancements.map((enhancement: any, index: number) => (
                    <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 border-b border-green-200 last:border-b-0 gap-1 sm:gap-0">
                      <span className="text-green-800 font-medium text-sm sm:text-base">{enhancement.title}</span>
                      <span className="text-green-700 font-semibold text-sm sm:text-base">€{enhancement.price} / {enhancement.pricingType.toLowerCase().replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Occupancy and Rates */}
          <div className="lg:w-1/2 space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* Occupancy Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-center text-gray-800">Occupancy</h3>
              
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
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors cursor-pointer"
                        onClick={() => updateOccupancy('adults', 1)}
                        disabled={adults >= selectedRoom.capacity}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                    {adults >= selectedRoom.capacity && (
                      <p className="text-xs text-orange-600 mt-1">Maximum capacity reached</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
 {/* Mobile Compact Enhancement Design */}
 {enhancements.length > 0 && (
            <div className="lg:hidden bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Add-ons</h3>
              <p className="text-sm text-gray-600 mb-4">Enhance your stay with these optional services</p>
              
              <div className="space-y-3">
                {enhancements.map((enhancement: any) => {
                  const isAdded = bookingData.selectedEnhancements.some((e: any) => e.id === enhancement.id);
                  return (
                    <div key={enhancement.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Small thumbnail for mobile */}
                        <img 
                          src={enhancement.image} 
                          alt={enhancement.title} 
                          className="w-12 h-12 rounded-md object-cover flex-shrink-0" 
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 leading-tight">{enhancement.title}</h4>
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
                                onClick={() => removeEnhancement(enhancement.id)}
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
                          
                          {/* Expandable details for mobile */}
                          {enhancementDetails[enhancement.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="bg-gray-50 rounded-md p-2 mb-2">
                                <p className="text-xs text-gray-700">Available during your {nights} night stay</p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {enhancement.availableDays.map((item: string, index: number) => (
                                  <span key={index} className="text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                                    {item}
                                  </span>
                                ))}   
                              </div>
                            </div>
                          )}
                          
                          <button
                            className="flex items-center text-gray-500 text-xs mt-2 hover:text-gray-700 transition-colors cursor-pointer"
                            onClick={() => toggleEnhancementDetails(enhancement.id)}
                          >
                            {enhancementDetails[enhancement.id] ? (
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

              {/* Selected Enhancements Summary for mobile */}
              {bookingData.selectedEnhancements?.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2 text-green-800">Selected Add-ons ({bookingData.selectedEnhancements.length})</h4>
                  <div className="space-y-1">
                    {bookingData.selectedEnhancements.map((enhancement: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-green-700">{enhancement.title}</span>
                        <span className="text-green-800 font-medium">€{enhancement.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
           )}
            {/* All Rate Options */}
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Available Rates</h3>
            
            {rateOptions.map((rateOption: any) => {
              const hasDiscount = rateOption.discountPercentage > 0;
              const totalPrice = rateOption.price * nights * rooms;
              const basePrice = selectedRoom?.price || 0;
              
              return (
                <div key={rateOption.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Rate Header */}
                  <div className={`p-3 sm:p-4 ${rateOption.type === 'special' && hasDiscount ? 'bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200' : 'bg-gray-50 border-b border-gray-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        {hasDiscount && <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />}
                        <h4 className={`font-bold text-sm sm:text-base ${hasDiscount ? 'text-orange-800' : 'text-gray-800'}`}>
                          {rateOption.name}
                        </h4>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${rateOption.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {rateOption.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {hasDiscount && (
                          <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                            -{rateOption.discountPercentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs sm:text-sm ${hasDiscount ? 'text-orange-700' : 'text-gray-600'}`}>
                      {rateOption.description}
                    </p>
                  </div>

                  {/* Rate Body */}
                  <div className="p-3 sm:p-4">
                    {/* Pricing Display */}
                    <div className="space-y-2 sm:space-y-3 mb-4">
                      {hasDiscount && rateOption.type === 'special' && (
                        <div className="flex justify-between items-center text-gray-500">
                          <span className="text-xs sm:text-sm">Original Rate:</span>
                          <span className="line-through text-xs sm:text-sm">€{basePrice.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-base sm:text-lg font-bold text-gray-800">€{rateOption.price.toFixed(2)}</span>
                        <span className="text-xs sm:text-sm text-gray-600">per night</span>
                      </div>
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
                      
                      {rateOption.fullPaymentDays && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <Clock className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="text-xs">Full payment required {rateOption.fullPaymentDays} days before arrival</span>
                        </div>
                      )}
                      
                      {rateOption.changeAllowedDays && (
                        <div className="text-gray-600 ml-5">
                          <span className="text-xs">Changes allowed up to {rateOption.changeAllowedDays} days before arrival</span>
                        </div>
                      )}
                    </div>

                    {/* Book Now Button */}
                    <button 
                      className={`w-full py-2 sm:py-3 rounded-lg font-semibold transition-colors cursor-pointer text-sm sm:text-base ${
                        hasDiscount 
                          ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                      onClick={() => handleBookNow(rateOption)}
                    >
                      Book This Rate - €{totalPrice.toFixed(2)}
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