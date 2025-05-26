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
  const [enhancementDetails, setEnhancementDetails] = useState({});
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(bookingData.adults || 2);

  console.log(bookingData)

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
      setBookingData(prev => ({ ...prev, adults: newAdults }));
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
    setEnhancementDetails(prev => ({
      ...prev,
      [enhancementId]: !prev[enhancementId]
    }));
  }

  function addEnhancement(enhancement: any) {
    const existingEnhancement = bookingData.selectedEnhancements.find(e => e.id === enhancement.id);
    if (!existingEnhancement) {
      setBookingData(prev => ({
        ...prev,
        selectedEnhancements: [...prev.selectedEnhancements, enhancement]
      }));
    }
  }

  function removeEnhancement(enhancementId: string) {
    setBookingData(prev => ({
      ...prev,
      selectedEnhancements: prev.selectedEnhancements.filter(e => e.id !== enhancementId)
    }));
  }

  function updateOccupancy(type: 'rooms' | 'adults', change: number) {
    if (type === 'rooms') {
      setRooms(prev => Math.max(1, prev + change));
    } else {
      const newAdults = Math.max(1, adults + change);
      if (newAdults <= selectedRoom.capacity) {
        setAdults(newAdults);
        setBookingData(prev => ({ ...prev, adults: newAdults }));
      }
    }
  }

  function handleBookNow(rateOption: any) {
    const enhancementPrice = bookingData.selectedEnhancements.length > 1  ? bookingData.selectedEnhancements?.reduce((acc, curr) => acc.price + curr.price + 0) : 0;
    console.log(enhancementPrice);
    setBookingData(prev => ({
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
      <div className="rounded-lg">
        <div className="py-6">
          <h2 className="text-2xl font-semibold text-center text-gray-800">Rates</h2>
        </div>
        <BookingSummary bookingData={bookingData} setCurrentStep={setCurrentStep} />
        
        {/* Room Display */}
        <div className="flex gap-4 p-4">
          <div className="bg-white flex rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md w-full">
            {/* Room image */}
            <div className="relative h-64 overflow-hidden p-3">
              {selectedRoom.images?.length > 0 ? (
                <img
                  src={selectedRoom.images[currentImageIndex]?.url}
                  alt={selectedRoom.name}
                  className="w-96 rounded-md h-full object-cover transition-transform cursor-pointer"
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
                    className={`cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full transition-colors ${currentImageIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    disabled={currentImageIndex === selectedRoom.images.length - 1}
                    className={`cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full transition-colors ${currentImageIndex === selectedRoom.images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                    {currentImageIndex + 1}/{selectedRoom.images.length}
                  </div>
                </>
              )}
            </div>
            
            <div>
              <div className="p-5 -mb-6">
                <h3 className="text-xl font-semibold text-gray-800">{selectedRoom.name}</h3>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                  <User className="h-5 w-5" />
                  <span>Maximum persons: {selectedRoom.capacity}</span>
                </div>

                {isExpanded && <p className="text-gray-600 mb-3">{selectedRoom.description}</p>}
                
                <div
                  className="flex items-center gap-1 text-gray-700 cursor-pointer mb-3"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-5 w-5" />
                      <span className="text-sm font-medium">Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-5 w-5" />
                      <span className="text-sm font-medium">More</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex gap-6 p-4">
          {/* Left Side - Enhancements */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Enhance your stay</h3>
            <div className="space-y-4">
              {enhancements.map((enhancement) => {
                const isAdded = bookingData.selectedEnhancements.some(e => e.id === enhancement.id);
                return (
                  <div key={enhancement.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex gap-4">
                      <img 
                        src={enhancement.image} 
                        alt={enhancement.title} 
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0" 
                      />
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{enhancement.title}</h4>
                        <p className="text-gray-600 text-sm mb-3">{enhancement.description}</p>
                        
                        {enhancementDetails[enhancement.id] && (
                            <div>
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <p className="text-sm text-gray-700">Perfect for your {nights} night stay. Available during your selected dates.</p>
                              </div>
                              <div className="flex gap-2">
                                   {enhancement.availableDays.map((item) => 
                                      (
                                        <span className="gap-2 flex text-gray-600">
                                            {item},
                                        </span>
                                      )
                                    )}   
                              </div>
                            </div>
                        )}
                        
                        <button
                          className="flex items-center text-gray-700 text-sm mb-4 hover:text-gray-900 transition-colors cursor-pointer"
                          onClick={() => toggleEnhancementDetails(enhancement.id)}
                        >
                          {enhancementDetails[enhancement.id] ? (
                            <>less <ChevronUp className="h-4 w-4 ml-1" /></>
                          ) : (
                            <>more <ChevronDown className="h-4 w-4 ml-1" /></>
                          )}
                        </button>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-bold text-gray-800">€{enhancement.price}</span>
                            <span className="text-gray-600 ml-1">/ {enhancement.pricingType.toLowerCase().replace('_', ' ')}</span>
                          </div>
                          
                          {isAdded ? (
                            <button 
                              className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer"
                              onClick={() => removeEnhancement(enhancement.id)}
                            >
                              Remove
                            </button>
                          ) : (
                            <button 
                              className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors cursor-pointer"
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

            {/* Selected Enhancements */}
            {bookingData.selectedEnhancements?.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Added Enhancements</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  {bookingData.selectedEnhancements.map((enhancement, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-green-200 last:border-b-0">
                      <span className="text-green-800 font-medium">{enhancement.title}</span>
                      <span className="text-green-700 font-semibold">€{enhancement.price} / {enhancement.pricingType.toLowerCase().replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Occupancy and Rates */}
          <div className="w-1/2 space-y-6">
            {/* Occupancy Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">Occupancy</h3>
              
              <div className="space-y-4">
            
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room 1:</label>
                  <div className="ml-4">
                    <label className="block text-sm text-gray-600 mb-1">Adults</label>
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <button 
                        className="w-8 h-8 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors cursor-pointer"
                        onClick={() => updateOccupancy('adults', -1)}
                        disabled={adults <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-semibold text-lg">{adults}</span>
                      <button 
                        className="w-8 h-8 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors cursor-pointer"
                        onClick={() => updateOccupancy('adults', 1)}
                        disabled={adults >= selectedRoom.capacity}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {adults >= selectedRoom.capacity && (
                      <p className="text-xs text-orange-600 mt-1">Maximum capacity reached</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* All Rate Options */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800">Available Rates</h3>
              
              {rateOptions.map((rateOption) => {
                const hasDiscount = rateOption.discountPercentage > 0;
                const totalPrice = rateOption.price * nights * rooms;
                const basePrice = selectedRoom?.price || 0;
                
                return (
                  <div key={rateOption.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Rate Header */}
                    <div className={`p-4 ${rateOption.type === 'special' && hasDiscount ? 'bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200' : 'bg-gray-50 border-b border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {hasDiscount && <Tag className="h-4 w-4 text-orange-600" />}
                          <h4 className={`font-bold ${hasDiscount ? 'text-orange-800' : 'text-gray-800'}`}>
                            {rateOption.name}
                          </h4>
                        </div>
                        <div className="flex gap-2">
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
                      <p className={`text-sm ${hasDiscount ? 'text-orange-700' : 'text-gray-600'}`}>
                        {rateOption.description}
                      </p>
                    </div>

                    {/* Rate Body */}
                    <div className="p-4">
                      {/* Pricing Display */}
                      <div className="space-y-3 mb-4">
                        {hasDiscount && rateOption.type === 'special' && (
                          <div className="flex justify-between items-center text-gray-500">
                            <span className="text-sm">Original Rate:</span>
                            <span className="line-through text-sm">€{basePrice.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-800">€{rateOption.price.toFixed(2)}</span>
                          <span className="text-sm text-gray-600">per night</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-semibold text-gray-700 border-t pt-2">
                          <span>Total ({nights} nights, {rooms} room{rooms > 1 ? 's' : ''}):</span>
                          <span className="text-xl font-bold text-gray-900">€{totalPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Policy Information */}
                      <div className="space-y-2 mb-4 text-xs">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-gray-600" />
                          <span className={`px-2 py-1 rounded font-medium ${rateOption.refundable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {rateOption.refundable ? 'Refundable' : 'Non-refundable'}
                          </span>
                        </div>
                        
                        {rateOption.fullPaymentDays && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>Full payment required {rateOption.fullPaymentDays} days before arrival</span>
                          </div>
                        )}
                        
                        {rateOption.changeAllowedDays && (
                          <div className="text-gray-600">
                            <span>Changes allowed up to {rateOption.changeAllowedDays} days before arrival</span>
                          </div>
                        )}
                      </div>

                      {/* Book Now Button */}
                      <button 
                        className={`w-full py-3 rounded-lg font-semibold transition-colors cursor-pointer ${
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
  );
}