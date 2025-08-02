import { useState, useEffect, useMemo } from "react";
import { format, addDays, isToday } from "date-fns";
import { RiCloseLine } from "react-icons/ri";
import { toast } from "react-hot-toast";
import { baseUrl } from "../../../utils/constants";
import type { RatePolicy } from "../../../types/types";
import BasePriceOverrideModal from "./BasePriceOverrideModal";
import RoomPriceIncreaseModal from "./RoomPriceIncreaseModal";
import RoomPriceOverrideModal from "./RoomPriceOverrideModal";

interface RatePricingCalendarProps {
  ratePolicy: RatePolicy;
  onClose: () => void;
}

interface Room {
  id: string;
  name: string;
  price: number;
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
  const [rooms, setRooms] = useState<any>([]);
  const [rateDatePrices, setRateDatePrices] = useState<RateDatePrice[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{room: Room, date: Date} | null>(null);
  const [modalType, setModalType] = useState<'base' | 'increase' | 'override' | null>(null);
  const [basePriceInput, setBasePriceInput] = useState<string>('');
  const [roomPercentages, setRoomPercentages] = useState<{ [roomId: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Generate dates for the current 10-day period
  const periodDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 10; i++) {
      dates.push(addDays(currentPeriodStart, i));
    }
    return dates;
  }, [currentPeriodStart]);

  // Filter rooms based on search
  const filteredRooms = rooms.filter((room: any) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch comprehensive calendar data
  const fetchCalendarData = async () => {
    try {
      const startDate = format(currentPeriodStart, 'yyyy-MM-dd');
      const endDate = format(addDays(currentPeriodStart, 9), 'yyyy-MM-dd');
      
      const response = await fetch(
        `${baseUrl}/rooms/availability/calendar?startDate=${startDate}&endDate=${endDate}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }
      
      const data = await response.json();
      const calendarData = data.data;
      
      setRooms(calendarData.availableRooms || []);
      
      // Build booking statuses from calendar data
      const statuses: BookingStatus[] = [];
      
      calendarData.availableRooms?.forEach((room: any) => {
        periodDates.forEach(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          let status: 'available' | 'confirmed' | 'provisional' | 'blocked' = 'available';
          
          if (room.bookedDates?.includes(dateStr)) {
            status = 'confirmed';
          } else if (room.restrictedDates?.includes(dateStr)) {
            status = 'blocked';
          } else if (calendarData.partiallyBookedDates?.includes(dateStr)) {
            status = 'provisional';
          }
          
          statuses.push({
            roomId: room.id,
            date: dateStr,
            status
          });
        });
      });
      
      setBookingStatuses(statuses);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    }
  };

  // Fetch rate date prices
  const fetchRateDatePrices = async () => {
    try {
      const startDate = format(currentPeriodStart, 'yyyy-MM-dd');
      const endDate = format(addDays(currentPeriodStart, 9), 'yyyy-MM-dd');
      
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
  }, [ratePolicy.id, currentPeriodStart]);

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 shadow-xl">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading pricing data...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={format(currentPeriodStart, 'yyyy-MM-dd')}
                onChange={(e) => setCurrentPeriodStart(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={format(addDays(currentPeriodStart, 9), 'yyyy-MM-dd')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Room List */}
          <div className="w-64 border-r bg-white flex flex-col">
            {/* Base Price Section */}
            <div className="p-4 border-b bg-white">
              <div className="text-lg font-semibold text-gray-800 mb-3">Base Price</div>
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                  <input
                    type="number"
                    value={basePriceInput}
                    onChange={(e) => setBasePriceInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <button
                  onClick={saveBasePrice}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rooms..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto">
              {filteredRooms.map((room: any) => (
                <div key={room.id} className="border-b bg-white hover:bg-blue-50 transition-colors">
                  <div className="p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">{room.name}</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 font-medium">Adjustment:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-500">+</span>
                        <input
                          type="number"
                          value={roomPercentages[room.id] || '0'}
                          onChange={(e) => handleRoomPercentageChange(room.id, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          step="0.01"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Final: €{calculateFinalPrice(room.id).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="p-4 border-t bg-white">
              <button
                onClick={saveRoomPercentages}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Save Room Adjustments
              </button>
            </div>
          </div>

          {/* Right Panel - Calendar Grid */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr>
                  {periodDates.map((date) => (
                    <th key={date.toISOString()} className="border-b border-gray-200 px-3 py-4 text-center min-w-[120px]">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {format(date, 'EEE')}
                      </div>
                      <div className="text-sm font-bold text-gray-800 mt-1">
                        {format(date, 'dd MMM')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room: any, index) => (
                  <tr key={room.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'} hover:bg-blue-25 transition-colors`}>
                    {periodDates.map((date) => {
                      const priceInfo = getPriceForRoomAndDate(room.id, date);
                      const bookingStatus = getBookingStatus(room.id, date);
                      const dayOfWeek = date.getDay();
                      
                      // Determine cell styling with iOS-inspired colors
                      let cellClasses = 'border-b border-gray-100 relative cursor-pointer transition-all hover:scale-105';
                      let bgColor = 'bg-green-100 hover:bg-green-200';
                      let textColor = 'text-green-800';
                      
                      if (bookingStatus === 'confirmed') {
                        bgColor = 'bg-red-100 hover:bg-red-200';
                        textColor = 'text-red-800';
                      } else if (bookingStatus === 'provisional') {
                        bgColor = 'bg-yellow-100 hover:bg-yellow-200';
                        textColor = 'text-yellow-800';
                      } else if (bookingStatus === 'blocked') {
                        bgColor = 'bg-gray-100 hover:bg-gray-200';
                        textColor = 'text-gray-800';
                      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                        bgColor = 'bg-blue-100 hover:bg-blue-200';
                        textColor = 'text-blue-800';
                      }
                      
                      return (
                        <td 
                          key={`${room.id}-${date.toISOString()}`} 
                          className={`${cellClasses} ${bgColor}`}
                          onClick={() => handleCellClick(room, date)}
                        >
                          <div className="p-4 text-center">
                            <div className={`text-lg font-bold ${textColor}`}>
                              €{priceInfo.price.toFixed(2)}
                            </div>
                            {priceInfo.hasCustomPrice && (
                              <div className="absolute top-1 right-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                  priceInfo.type === 'BASE_OVERRIDE' ? 'bg-red-500 text-white' :
                                  priceInfo.type === 'ROOM_INCREASE' ? 'bg-orange-500 text-white' :
                                  'bg-purple-500 text-white'
                                }`}>
                                  {priceInfo.type === 'BASE_OVERRIDE' && 'B'}
                                  {priceInfo.type === 'ROOM_INCREASE' && 'I'}
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
        </div>

        {/* Bottom Legend */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-8 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="font-medium">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="font-medium">Booked</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="font-medium">Provisional</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="font-medium">Weekend</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span className="font-medium">Blocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {modalType === 'base' && selectedCell && (
          <BasePriceOverrideModal
            ratePolicy={ratePolicy}
            room={selectedCell.room}
            date={selectedCell.date}
            onClose={() => setModalType(null)}
            onSave={handlePriceUpdate}
          />
        )}
        
        {modalType === 'increase' && selectedCell && (
          <RoomPriceIncreaseModal
            ratePolicy={ratePolicy}
            room={selectedCell.room}
            date={selectedCell.date}
            onClose={() => setModalType(null)}
            onSave={handlePriceUpdate}
          />
        )}
        
        {modalType === 'override' && selectedCell && (
          <RoomPriceOverrideModal
            ratePolicy={ratePolicy}
            room={selectedCell.room}
            date={selectedCell.date}
            onClose={() => setModalType(null)}
            onSave={handlePriceUpdate}
          />
        )}
      </div>
    </div>
  );
}