import { useState, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import { RiCloseLine } from "react-icons/ri";
import { toast } from "react-hot-toast";
import { baseUrl } from "../../../utils/constants";
import { useCalendarAvailability } from "../../../hooks/useCalendarAvailability";
import type { RatePolicy, Room } from "../../../types/types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isValid } from 'date-fns';
import RoomPriceOverrideModal from "./RoomPriceOverrideModal";
import BulkOverrideModal from "./BulkOverrideModal";
import Loader from "../../Loader";

interface RatePricingCalendarProps {
  ratePolicy: RatePolicy;
  onClose: () => void;
}

interface RateDatePrice {
  id: string;
  roomId: string;
  date: string;
  price: number;
  priceType: 'BASE_OVERRIDE' | 'ROOM_INCREASE' | 'ROOM_OVERRIDE';
  room: Room;
  isActive: boolean;
}

interface BookingStatus {
  roomId: string;
  date: string;
  status: 'available' | 'confirmed' | 'provisional' | 'blocked';
}

export default function RatePricingCalendar({ ratePolicy, onClose }: RatePricingCalendarProps) {
  const [currentPeriodStart, setCurrentPeriodStart] = useState(new Date());
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(addDays(new Date(), 9));
  const [rooms, setRooms] = useState<any>([]);
  const [rateDatePrices, setRateDatePrices] = useState<RateDatePrice[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{room: Room, date: Date} | null>(null);
  const [modalType, setModalType] = useState<'base' | 'increase' | 'override' | 'bulk' | null>(null);
  const [basePriceInput, setBasePriceInput] = useState<string>('');
  const [roomPercentages, setRoomPercentages] = useState<{ [roomId: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  

  // Use the centralized calendar availability hook
  const { fetchCalendarAvailability, processBookingStatuses } = useCalendarAvailability();

  // Generate dates for the current period
  const periodDates = useMemo(() => {
    const dates = [];
    const diffTime = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    
    for (let i = 0; i < diffDays; i++) { // No limit for admin use
      dates.push(addDays(currentPeriodStart, i));
    }
    return dates;
  }, [currentPeriodStart, currentPeriodEnd]);

  // Filter rooms based on search
  const filteredRooms = rooms.filter((room: any) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch comprehensive calendar data using the hook
  const fetchCalendarData = async () => {
    try {
      const startDate = currentPeriodStart;
      const endDate = currentPeriodEnd;
      
      const calendarData = await fetchCalendarAvailability({
        startDate,
        endDate,
        showError: true,
        cacheEnabled: false // Disable cache for admin pricing calendar
      });
      
      if (calendarData) {
        setRooms(calendarData.availableRooms || []);
        
        // Process booking statuses using the hook helper
        const statuses = processBookingStatuses(calendarData, periodDates);
        setBookingStatuses(statuses);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  // Fetch rate date prices
  const fetchRateDatePrices = async () => {
    try {
      const startDate = format(currentPeriodStart, 'yyyy-MM-dd');
      const endDate = format(currentPeriodEnd, 'yyyy-MM-dd');
      
      const response = await fetch(
        `${baseUrl}/admin/rate-policies/${ratePolicy.id}/date-prices?startDate=${startDate}&endDate=${endDate}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch rate date prices');
      }
      
      const data = await response.json();
      setRateDatePrices(data.data || []);
    } catch (error) {
      console.error('Error fetching rate date prices:', error);
    }
  };

  // Fetch rate policy pricing info
  const fetchRatePolicyPricing = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/rate-policies/${ratePolicy.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch rate policy pricing');
      }
      
      const data = await response.json();
      const ratePolicyData = data.data;
      
      setBasePriceInput(ratePolicyData.basePrice?.toString() || '');
      
      const percentages: { [roomId: string]: string } = {};
      if (ratePolicyData.roomRates && Array.isArray(ratePolicyData.roomRates)) {
        ratePolicyData.roomRates.forEach((roomRate: any) => {
          percentages[roomRate.roomId] = roomRate.percentageAdjustment?.toString() || '0';
        });
      }
      setRoomPercentages(percentages);
      
    } catch (error) {
      console.error('Error fetching rate policy pricing:', error);
      toast.error('Failed to load pricing data');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCalendarData(),
        fetchRateDatePrices(),
        fetchRatePolicyPricing(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [ratePolicy.id, currentPeriodStart, currentPeriodEnd]);

  // Calculate final price for a room
  const calculateFinalPrice = (roomId: string) => {
    const basePrice = parseFloat(basePriceInput) || 0;
    const percentage = parseFloat(roomPercentages[roomId] || '0');
    
    if (basePrice === 0) return 0;
    
    const adjustment = (basePrice * percentage) / 100;
    return Math.round((basePrice + adjustment) * 100) / 100;
  };

  // Get price for room and date
  const getPriceForRoomAndDate = (roomId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const rateDatePrice = rateDatePrices.find(
      rdp => rdp.roomId === roomId && rdp.date.split('T')[0] === dateStr
    );
    
    if (rateDatePrice) {
      return {
        price: rateDatePrice.price,
        type: rateDatePrice.priceType,
        hasCustomPrice: true
      };
    }
    
    return {
      price: calculateFinalPrice(roomId),
      type: 'CALCULATED' as const,
      hasCustomPrice: false
    };
  };

  // Get booking status
  const getBookingStatus = (roomId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const status = bookingStatuses.find(
      bs => bs.roomId === roomId && bs.date === dateStr
    );
    return status?.status || 'available';
  };

  // Save base price
  const saveBasePrice = async () => {
    try {
      const basePrice = parseFloat(basePriceInput);
      
      if (isNaN(basePrice) || basePrice < 0) {
        toast.error('Please enter a valid base price');
        return;
      }

      const response = await fetch(`${baseUrl}/admin/rate-policies/${ratePolicy.id}/base-price`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          basePrice: basePrice
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update base price');
      }

      toast.success('Base price updated successfully');
    } catch (error) {
      console.error('Error updating base price:', error);
      toast.error('Failed to update base price');
    }
  };

  // Save room percentages
  const saveRoomPercentages = async () => {
    try {
      const updates = Object.entries(roomPercentages).map(([roomId, percentage]) => ({
        roomId,
        percentageAdjustment: parseFloat(percentage) || 0
      }));

      const response = await fetch(`${baseUrl}/admin/rate-policies/${ratePolicy.id}/room-percentages`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomPercentages: updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update room percentages');
      }

      toast.success('Room percentages updated successfully');
    } catch (error) {
      console.error('Error updating room percentages:', error);
      toast.error('Failed to update room percentages');
    }
  };

  const handleRoomPercentageChange = (roomId: string, value: string) => {
    setRoomPercentages(prev => ({
      ...prev,
      [roomId]: value
    }));
  };

  const handleCellClick = (room: Room, date: Date) => {
    setSelectedCell({ room, date });
    setModalType('override'); // Default to room price override
  };

  const handlePriceUpdate = () => {
    fetchRateDatePrices();
    fetchCalendarData();
    setModalType(null);
    setSelectedCell(null);
  };


  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-full w-[98%] h-[95vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-2xl font-bold text-gray-800">
            Pricing Calendar - {ratePolicy.name}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Date Controls Bar */}
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600 font-medium">Base Override</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-600 font-medium">Room Increase</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600 font-medium">Room Override</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-gray-700">Date Range</span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period Start
                </label>
                <DatePicker
                  selected={currentPeriodStart}
                  onChange={(date: Date | null) => {
                    if (date && isValid(date)) {
                      setCurrentPeriodStart(date);
                    }
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select start date"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                />
              </div>
              
              <span className="text-gray-500 mt-0 sm:mt-6 text-center">to</span>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period End
                </label>
                <DatePicker
                  selected={currentPeriodEnd}
                  onChange={(date: Date | null) => {
                    if (date && isValid(date)) {
                      setCurrentPeriodEnd(date);
                    }
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select end date"
                  minDate={currentPeriodStart}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Pricing Configuration */}
        {loading ? <Loader /> : <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Controls Section */}
          <div className="bg-white border-b p-4">
            <div className="flex items-start justify-between gap-6">
              {/* Base Price Section */}
              <div className="flex-1 max-w-md">
                <div className="text-sm font-semibold text-gray-700 mb-2">Base Price</div>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                    <input
                      type="number"
                      value={basePriceInput}
                      onChange={(e) => setBasePriceInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={saveBasePrice}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Search Section */}
              <div className="flex-1 max-w-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2">Search Rooms</div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search rooms..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Bulk Override Section */}
              <div className="flex-1 max-w-sm">
                <div className="text-sm font-semibold text-gray-700 mb-2">Bulk Actions</div>
                <button
                  onClick={() => setModalType('bulk')}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Bulk Override Prices
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  Override prices for multiple dates and rooms at once
                </p>
              </div>
            </div>
          </div>

          {/* Single Table for Room Info and Calendar */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <table className="w-full border-collapse bg-white">
              <thead className="sticky top-0 bg-white z-20 shadow-sm">
                <tr>
                  {/* Room Header Column */}
                  <th className="sticky left-0 bg-white z-30 border-r border-b border-gray-200 px-4 py-3 text-left min-w-[280px]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Room / Rates</span>
                      <button
                        onClick={saveRoomPercentages}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        Save Rates
                      </button>
                    </div>
                  </th>
                  {/* Date Headers */}
                  {periodDates.map((date) => (
                    <th key={date.toISOString()} className="border-b border-gray-200 px-3 py-3 text-center min-w-[100px]">
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        {format(date, 'EEE')}
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {format(date, 'dd/MM')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room: any, index: number) => (
                  <tr key={room.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {/* Room Info Column */}
                    <td className="sticky left-0 bg-inherit z-10 border-r border-b border-gray-200 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{room.name}</div>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="text-xs text-gray-500">Adjustment:</span>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500">+</span>
                              <input
                                type="number"
                                value={roomPercentages[room.id] || '0'}
                                onChange={(e) => handleRoomPercentageChange(room.id, e.target.value)}
                                className="w-16 mx-1 px-2 py-0.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                step="0.01"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium text-gray-700">
                            €{calculateFinalPrice(room.id).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Price Cells */}
                    {periodDates.map((date) => {
                      const priceInfo = getPriceForRoomAndDate(room.id, date);
                      const bookingStatus = getBookingStatus(room.id, date);
                      const dayOfWeek = date.getDay();
                      
                      // Determine cell styling
                      let bgColor = '';
                      let textColor = 'text-gray-900';
                      
                      if (bookingStatus === 'confirmed') {
                        bgColor = 'bg-red-50';
                        textColor = 'text-red-700';
                      } else if (bookingStatus === 'provisional') {
                        bgColor = 'bg-yellow-50';
                        textColor = 'text-yellow-700';
                      } else if (bookingStatus === 'blocked') {
                        bgColor = 'bg-gray-100';
                        textColor = 'text-gray-500';
                      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                        bgColor = 'bg-blue-50';
                        textColor = 'text-blue-700';
                      }
                      
                      return (
                        <td 
                          key={`${room.id}-${date.toISOString()}`} 
                          className={`border-b border-gray-200 text-center cursor-pointer hover:bg-gray-100 transition-colors ${bgColor}`}
                          onClick={() => handleCellClick(room, date)}
                        >
                          <div className="py-3 px-2 relative">
                            <div className={`text-sm font-medium ${textColor}`}>
                              {priceInfo.price.toFixed(2)}
                            </div>
                            {priceInfo.hasCustomPrice && (
                              <div className="absolute top-1 right-1">
                                <span className={`inline-block w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                  priceInfo.type === 'BASE_OVERRIDE' ? 'bg-red-500 text-white' :
                                  priceInfo.type === 'ROOM_INCREASE' ? 'bg-orange-500 text-white' :
                                  'bg-purple-500 text-white'
                                }`}>
                                  {priceInfo.type === 'BASE_OVERRIDE' && 'B'}
                                  {priceInfo.type === 'ROOM_INCREASE' && '+'}
                                  {priceInfo.type === 'ROOM_OVERRIDE' && 'O'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>}

        {/* Bottom Legend */}
        <div className="p-3 border-t bg-gray-50">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-6 text-xs text-gray-600">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-red-50 border border-red-300 rounded"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-yellow-50 border border-yellow-300 rounded"></div>
                <span>Provisional</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded"></div>
                <span>Weekend</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 bg-gray-100 border border-gray-400 rounded"></div>
                <span>Blocked</span>
              </div>
              <div className="border-l border-gray-300 pl-6 ml-2 flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <span className="inline-block w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">B</span>
                  <span>Base Override</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="inline-block w-4 h-4 bg-orange-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">+</span>
                  <span>Room Increase</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="inline-block w-4 h-4 bg-purple-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">O</span>
                  <span>Room Override</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {modalType === 'override' && selectedCell && (
          <RoomPriceOverrideModal
            ratePolicy={ratePolicy}
            room={selectedCell.room}
            date={selectedCell.date}
            calculatedPrice={getPriceForRoomAndDate(selectedCell.room.id, selectedCell.date).price}
            onClose={() => setModalType(null)}
            onUpdate={handlePriceUpdate}
            onSwitchModal={setModalType}
          />
        )}

        {modalType === 'bulk' && (
          <BulkOverrideModal
            ratePolicy={ratePolicy}
            rooms={rooms}
            onClose={() => setModalType(null)}
            onUpdate={handlePriceUpdate}
          />
        )}
      </div>
    </div>
  );
}