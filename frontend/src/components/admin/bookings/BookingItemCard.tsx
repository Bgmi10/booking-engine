import React from "react";
import { RiSubtractLine } from "react-icons/ri";
import { BiLoader } from "react-icons/bi";
import type { BookingItem, Enhancement, Room } from "../../../types/types";
import DateSelector from '../../DateSelector';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';


interface BookingItemCardProps {
  item: BookingItem;
  index: number;
  rooms: Room[];
  enhancements: Enhancement[];
  loadingAction: boolean;
  loadingRooms: boolean;
  updateBookingItem: (index: number, field: keyof BookingItem, value: any) => void;
  removeBookingItem: (index: number) => void;
  toggleEnhancement: (bookingIndex: number, enhancement: Enhancement) => void;
  getRateOptions: (room: Room, checkIn?: string, checkOut?: string) => any[];
  selectRateOption: (bookingIndex: number, rateOption: any) => void;
  canRemove: boolean;
  availabilityData?: any;
  isLoadingAvailability?: boolean;
  fetchCalendarAvailability?: (startDate: string, endDate: string) => Promise<void>;
  refreshRatePricingForDates?: (startDate: string, endDate: string) => Promise<void>;
}

const BookingItemCard: React.FC<BookingItemCardProps> = ({
  item,
  index,
  rooms,
  enhancements,
  loadingAction,
  loadingRooms,
  updateBookingItem,
  removeBookingItem,
  toggleEnhancement,
  getRateOptions,
  selectRateOption,
  canRemove,
  availabilityData = { minStayDays: 2, fullyBookedDates: [], partiallyBookedDates: [], availableDates: [], restrictedDates: [], dateRestrictions: {} },
  isLoadingAvailability = false,
  fetchCalendarAvailability,
  refreshRatePricingForDates,
}) => {
  // Local state for calendar open/close
  const [calenderOpen, setCalenderOpen] = useState(false);
  // Local state for price breakdown expansion
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<{[key: string]: boolean}>({});

  // Handler for date selection
  const handleDateSelect = async ({ startDate, endDate }: { startDate: Date | null; endDate: Date | null }) => {
    const checkIn = startDate ? startDate.toISOString().split('T')[0] : '';
    const checkOut = endDate ? endDate.toISOString().split('T')[0] : '';
    
    // Refresh rate pricing data BEFORE updating booking items to ensure fresh data
    if (refreshRatePricingForDates && checkIn && checkOut) {
      try {
        await refreshRatePricingForDates(checkIn, checkOut);
      } catch (error) {
        console.error('Error refreshing rate pricing:', error);
      }
    }
    
    // Update booking item dates after refreshing pricing data
    updateBookingItem(index, 'checkIn', checkIn);
    updateBookingItem(index, 'checkOut', checkOut);
    setCalenderOpen(false);
  };

  // Handler to open calendar and fetch availability
  const handleOpenCalendar = () => {
    setCalenderOpen(true);
    if (fetchCalendarAvailability) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      fetchCalendarAvailability(formatDateForAPI(startOfMonth), formatDateForAPI(endOfMonth));
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h5 className="text-md font-medium text-gray-900">Room {index + 1}</h5>
        {canRemove && (
          <button
            onClick={() => removeBookingItem(index)}
            className="text-red-600 hover:text-red-800"
            disabled={loadingAction}
          >
            <RiSubtractLine size={20} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room *</label>
          {loadingRooms ? (
            <div className="flex items-center space-x-2">
              <BiLoader className="animate-spin text-indigo-600" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : (
            <select
              value={item.selectedRoom}
              onChange={(e) => updateBookingItem(index, "selectedRoom", e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={loadingAction}
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} - €{room.price}/night (Cap: {room.capacity})
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adults {item.roomDetails && `(Max: ${item.roomDetails.capacity * item.rooms})`}
          </label>
          <input
            type="number"
            min="1"
            max={item.roomDetails ? item.roomDetails.capacity * item.rooms : undefined}
            value={item.adults}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                updateBookingItem(index, "adults", value);
                return;
              }
              const parsed = Number.parseInt(value);
              if (!isNaN(parsed)) {
                updateBookingItem(index, "adults", parsed);
              }
            }}
            onBlur={(e) => {
              const parsed = Number.parseInt(e.target.value);
              const min = 1;
              const max = item.roomDetails ? item.roomDetails.capacity * item.rooms : Infinity;
              const sanitized = Math.min(Math.max(parsed || min, min), max);
              updateBookingItem(index, "adults", sanitized);
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loadingAction}
          />
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Dates *</label>
          <button
            type="button"
            className="w-full px-3 py-2 border border-gray-400 rounded-md bg-white text-gray-700 hover:bg-gray-50"
            onClick={handleOpenCalendar}
            disabled={loadingAction}
          >
            {item.checkIn && item.checkOut
              ? `Selected: ${item.checkIn} to ${item.checkOut}`
              : 'Select Dates'}
          </button>
          <DateSelector
            minStayDays={availabilityData.minStayDays || 2}
            calenderOpen={calenderOpen}
            setCalenderOpen={setCalenderOpen}
            onSelect={handleDateSelect}
            availabilityData={availabilityData}
            isLoadingAvailability={isLoadingAvailability}
            onFetchAvailability={fetchCalendarAvailability || (() => Promise.resolve())}
          />
        </div>
      </div>
      {item.error && (
        <div className="mt-1 mb-4">
          <p className="text-sm text-red-600">{item.error}</p>
        </div>
      )}
      {/* Enhancements Section */}
      {enhancements.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Enhancements</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {enhancements.map((enhancement) => (
              <label
                key={enhancement.id}
                className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.selectedEnhancements.some((e) => e.id === enhancement.id)}
                  onChange={() => toggleEnhancement(index, enhancement)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                  disabled={loadingAction}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{enhancement.title}</div>
                  <div className="text-sm text-gray-500">
                    €{enhancement.price} {enhancement.pricingType.toLowerCase().replace("_", " ")}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{enhancement.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
      {/* Rate Options Section */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Rate Options</label>
        <div className="space-y-3">
          {item.roomDetails &&
            getRateOptions(item.roomDetails, item.checkIn, item.checkOut).map((rateOption: any) => {
              const hasDiscount = rateOption.discountPercentage > 0;
              const isSelected = item.selectedRateOption?.id === rateOption.id;
              const checkInDate = new Date(item.checkIn);
              const checkOutDate = new Date(item.checkOut);
              const nights = Math.ceil(
                (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              // Use price breakdown total if available, otherwise calculate from average price
              const totalPrice = rateOption.priceBreakdown 
                ? rateOption.priceBreakdown.totalPrice * item.rooms
                : rateOption.price * nights * item.rooms;
              return (
                <div
                  key={rateOption.id}
                  className={`border rounded-lg overflow-hidden ${
                    isSelected
                      ? "border-indigo-500 ring-1 ring-indigo-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`p-3 ${
                      rateOption.type === "special" && hasDiscount
                        ? "bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200"
                        : "bg-gray-50 border-b border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {hasDiscount && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-orange-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                          </svg>
                        )}
                        <h4
                          className={`font-medium text-sm ${hasDiscount ? "text-orange-800" : "text-gray-800"}`}
                        >
                          {rateOption.name}
                          {rateOption.type === "configured" && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Room Rate
                            </span>
                          )}
                          {rateOption.type === "available" && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Private Rate
                            </span>
                          )}
                        </h4>
                      </div>
                      <div className="flex gap-2">
                        {hasDiscount && (
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                            -{rateOption.discountPercentage}%
                          </span>
                        )}
                        {rateOption.adjustmentPercentage !== undefined && rateOption.adjustmentPercentage !== 0 && (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            rateOption.adjustmentPercentage > 0 
                              ? 'bg-orange-600 text-white' 
                              : 'bg-green-600 text-white'
                          }`}>
                            {rateOption.adjustmentPercentage > 0 ? '+' : ''}{rateOption.adjustmentPercentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs ${hasDiscount ? "text-orange-700" : "text-gray-600"}`}>
                      {rateOption.description}
                    </p>
                  </div>
                  <div className="p-3">
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-800">
                          €{rateOption.price.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-600">{rateOption.priceLabel || 'per night'}</span>
                      </div>
                      
                      {/* Show price breakdown like user app if available */}
                      {rateOption.priceBreakdown && rateOption.priceBreakdown.subtotalBeforeAdjustment && (
                        <div className="space-y-1 text-sm border-t pt-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>€{(rateOption.priceBreakdown.subtotalBeforeAdjustment * item.rooms).toFixed(2)}</span>
                          </div>
                          {rateOption.priceBreakdown.adjustmentAmount && (
                            <div className="flex justify-between text-blue-700">
                              <span>
                                Rate adjustment ({rateOption.adjustmentPercentage > 0 ? '+' : ''}{rateOption.adjustmentPercentage}%):
                              </span>
                              <span>
                                {rateOption.adjustmentPercentage > 0 ? '+' : ''}€{(rateOption.priceBreakdown.adjustmentAmount * item.rooms).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Daily price breakdown button (like user app) */}
                      {rateOption.priceBreakdown && rateOption.priceBreakdown.breakdown && rateOption.priceBreakdown.breakdown.some((day: any) => day.isOverride) && (
                        <div className="border-t pt-2">
                          <button
                            onClick={() => setExpandedBreakdowns(prev => ({
                              ...prev,
                              [rateOption.id]: !prev[rateOption.id]
                            }))}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <span>View price breakdown</span>
                            {expandedBreakdowns[rateOption.id] ? 
                              <ChevronUp className="h-3 w-3" /> : 
                              <ChevronDown className="h-3 w-3" />
                            }
                          </button>
                        </div>
                      )}
                      
                      {/* Expandable detailed breakdown */}
                      {expandedBreakdowns[rateOption.id] && rateOption.priceBreakdown && rateOption.priceBreakdown.breakdown && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 space-y-2">
                          <h5 className="text-sm font-semibold text-gray-700">Daily Price Breakdown:</h5>
                          <div className="space-y-1">
                            {rateOption.priceBreakdown.breakdown.map((day: any, dayIndex: number) => (
                              <div key={dayIndex} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  {day.isOverride && <span className="text-orange-600 ml-1">(Special Rate)</span>}
                                </span>
                                <span className="text-gray-900 font-medium">€{day.price.toFixed(2)}</span>
                              </div>
                            ))}
                            
                            {/* Subtotal and adjustment in breakdown */}
                            <div className="border-t pt-2 mt-2 space-y-1">
                              <div className="flex justify-between text-sm font-medium">
                                <span>Subtotal:</span>
                                <span>€{(rateOption.priceBreakdown.subtotalBeforeAdjustment || rateOption.priceBreakdown.totalPrice).toFixed(2)}</span>
                              </div>
                              
                              {rateOption.priceBreakdown.adjustmentAmount && (
                                <div className="flex justify-between text-sm text-blue-700">
                                  <span>Rate adjustment ({rateOption.adjustmentPercentage > 0 ? '+' : ''}{rateOption.adjustmentPercentage}%):</span>
                                  <span>{rateOption.adjustmentPercentage > 0 ? '+' : ''}€{rateOption.priceBreakdown.adjustmentAmount.toFixed(2)}</span>
                                </div>
                              )}
                              
                              <div className="flex justify-between text-sm font-semibold text-gray-900 border-t pt-1">
                                <span>Total for {nights} nights:</span>
                                <span>€{rateOption.priceBreakdown.totalPrice.toFixed(2)}</span>
                              </div>
                              
                              <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-1">
                                <span>Total ({nights} nights, {item.rooms} room{item.rooms > 1 ? 's' : ''}):</span>
                                <span>€{(rateOption.priceBreakdown.totalPrice * item.rooms).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-sm font-medium text-gray-700 border-t pt-2">
                        <span>Total ({nights} nights):</span>
                        <span className="font-bold text-gray-900">€{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="space-y-1 mb-3 text-xs">
                      <div className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 text-gray-600"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium ${rateOption.refundable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {rateOption.refundable ? "Refundable" : "Non-refundable"}
                        </span>
                      </div>
                      
                      {/* Payment Structure Information */}
                      {rateOption.paymentStructure && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-gray-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                          </svg>
                          <span className="px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
                            {rateOption.paymentStructure === 'SPLIT_PAYMENT' ? 'Split Payment (30% + 70%)' : 'Full Payment'}
                          </span>
                        </div>
                      )}
                      
                      {/* Additional policy details */}
                      {rateOption.fullPaymentDays && (
                        <div className="text-gray-600 ml-4">
                          <span>Final payment due {rateOption.fullPaymentDays} days before arrival</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`w-full py-1.5 rounded font-medium transition-colors text-xs ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : hasDiscount
                          ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                      onClick={() => selectRateOption(index, rateOption)}
                    >
                      {isSelected ? "Selected" : "Select Rate"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default BookingItemCard; 