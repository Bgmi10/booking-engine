/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import BookingSummary from "./BookingSummary";
import { baseUrl } from "../utils/constants";
import { format } from "date-fns";
import type { Enhancement } from "../types/types";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, User } from "lucide-react";

export default function Rates({ bookingData, setCurrentStep, availabilityData }: { bookingData: any, setCurrentStep: (step: number) => void, availabilityData: any }) {

  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const formattedCheckIn = format(new Date(bookingData.checkIn), "yyyy-MM-dd");
  const formattedCheckOut = format(new Date(bookingData.checkOut), "yyyy-MM-dd");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const selectedRoom = availabilityData.availableRooms.find((room: any) => room.id === bookingData.selectedRoom);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [enhancementDetails, setEnhancementDetails] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(0);

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

  useEffect(() => {
    fetchEnhancements();
  }, [bookingData.checkIn, bookingData.checkOut])

  return <div>
    <div className="rounded-lg">
      <div className="py-6">
        <h2 className="text-2xl font-semibold text-center text-gray-800">Rates</h2>
      </div>
        <BookingSummary bookingData={bookingData} setCurrentStep={setCurrentStep} />
        <div className="flex gap-4 p-4">
            <div
            key={selectedRoom.id}
            className={`bg-white flex rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md w-full`}
          >
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

              {/* Image navigation - only show if there are multiple images */}
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

            {/* Room details */}
            <div className="p-5">
              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <User className="h-5 w-5" />
                <span>Maximum persons: {selectedRoom.capacity}</span>
              </div>

              {/* Description toggle */}
              { isExpanded && <p>
                {selectedRoom.description}
              </p>}
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
        <div className="flex gap-4 p-4">
            <div>
                <span>Enhance your stay</span>
                <div className="flex gap-4 mt-4">
                    {enhancements.map((enhancement) => (
                        <div key={enhancement.id} className="flex flex-col gap-2">
                            <img src={enhancement.image} alt={enhancement.title} className="w-52 rounded-md" />
                            <span className="text-lg font-semibold">{enhancement.title}</span>
                            <span>{enhancement.description}</span>
                           {enhancementDetails ? <span className="flex items-center cursor-pointer" onClick={() => setEnhancementDetails(!enhancementDetails)}>less<ChevronUp className="h-5 w-5" /></span> : <span className="flex items-center cursor-pointer" onClick={() => setEnhancementDetails(!enhancementDetails)}>more<ChevronDown className="h-5 w-5" /></span>}
                            {enhancementDetails && <div>
                                <span>{enhancement.description}</span>
                            </div>}
                            <span>€{enhancement.price}/ {enhancement.pricingType}</span>
                            <div className="flex gap-2">
                                <div className="flex gap-2">
                                    <button className="bg-gray-900 text-white px-2 py-1 rounded-md" onClick={() => setSelectedQuantity(prev => prev - 1)}>-</button>
                                    <span>{selectedQuantity}</span>
                                    <button className="bg-gray-900 text-white px-2 py-1 rounded-md" onClick={() => setSelectedQuantity(prev => prev + 1)}>+</button>
                                </div>
                                <button className="bg-gray-900 text-white px-2 py-1 rounded-md">Add</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div>
                    <span>Occpancy</span>
                </div>
                <div>
                    <span>Rates</span>
                </div>
            </div>
        </div>
    </div>
  </div>
}