
import { useState, useEffect, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, isToday } from "date-fns";
import { RiCloseLine, RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";
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
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [rooms, setRooms] = useState<any>([]);
  const [rateDatePrices, setRateDatePrices] = useState<RateDatePrice[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{room: Room, date: Date} | null>(null);
  const [modalType, setModalType] = useState<'base' | 'increase' | 'override' | null>(null);

  // Generate dates for the current week
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(currentWeekStart, i));
    }
    return dates;
  }, [currentWeekStart]);

  // Fetch comprehensive calendar data instead of just rooms
  const fetchCalendarData = async () => {
    try {
      const startDate = format(currentWeekStart, "yyyy-MM-dd");
      const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
      
      const response = await fetch(
        `${baseUrl}/rooms/availability/calendar?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      
      const data = await response.json();
      if (response.ok) {
        const calendarData = data.data;
        // Combine available and unavailable rooms
        const allRooms = [...(calendarData.availableRooms || []), ...(calendarData.unavailableRooms || [])];
        setRooms(allRooms);
        
        // Generate booking statuses from the comprehensive data
        generateBookingStatusesFromCalendarData(calendarData);
      }
    } catch (error) {
      toast.error("Failed to fetch calendar data");
    }
  };

  // Fetch rate date prices
  const fetchRateDatePrices = async () => {
    try {
      const startDate = format(currentWeekStart, "yyyy-MM-dd");
      const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
      
      const response = await fetch(
        `${baseUrl}/admin/rate-policies/${ratePolicy.id}/date-prices?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      
      const data = await response.json();
      if (response.ok) {
        setRateDatePrices(data.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch rate pricing");
    }
  };

  // Generate booking statuses from comprehensive calendar data
  const generateBookingStatusesFromCalendarData = (calendarData: any) => {
    const statuses: BookingStatus[] = [];
    
    const allRooms = [...(calendarData.availableRooms || []), ...(calendarData.unavailableRooms || [])];
    
    allRooms.forEach(room => {
      weekDates.forEach(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        let status: BookingStatus['status'] = 'available';
        
        // Check if date is in room's booked dates
        if (room.bookedDates && room.bookedDates.includes(dateStr)) {
          status = 'confirmed';
        }
        // Check if date is in room's restricted dates
        else if (room.restrictedDates && room.restrictedDates.includes(dateStr)) {
          status = 'blocked';
        }
        // Check overall calendar status
        else if (calendarData.fullyBookedDates && calendarData.fullyBookedDates.includes(dateStr)) {
          status = 'confirmed';
        }
        else if (calendarData.partiallyBookedDates && calendarData.partiallyBookedDates.includes(dateStr)) {
          status = 'provisional';
        }
        else if (calendarData.restrictedDates && calendarData.restrictedDates.includes(dateStr)) {
          status = 'blocked';
        }
        
        statuses.push({
          roomId: room.id,
          date: dateStr,
          status
        });
      });
    });
    
    setBookingStatuses(statuses);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCalendarData(),
        fetchRateDatePrices(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [ratePolicy.id, currentWeekStart]);

  // This effect is no longer needed since we generate booking statuses 
  // directly from calendar data in fetchCalendarData

  // Get price for a specific room and date
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
    
    const room = rooms.find((r: any) => r.id === roomId);
    return {
      price: room?.price || 0,
      type: 'BASE' as const,
      hasCustomPrice: false
    };
  };

  // Get booking status for a specific room and date
  const getBookingStatus = (roomId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const status = bookingStatuses.find(
      bs => bs.roomId === roomId && bs.date === dateStr
    );
    return status?.status || 'available';
  };

  // Get color class based on booking status
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'confirmed':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'provisional':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'blocked':  
        return 'bg-red-100 border-red-200 text-red-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  // Handle cell click
  const handleCellClick = (room: Room, date: Date) => {
    setSelectedCell({ room, date });
    // Default to override modal - user can choose different action in modal
    setModalType('override');
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Handle price update callback
  const handlePriceUpdate = () => {
    fetchRateDatePrices();
    // Refresh calendar data to get updated availability status
    fetchCalendarData();
    setModalType(null);
    setSelectedCell(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Rate Pricing Calendar - {ratePolicy.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure pricing for each room and date under this rate policy
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-gray-200 rounded-full"
            >
              <RiArrowLeftLine size={20} />
            </button>
            <div className="text-lg font-medium">
              {format(currentWeekStart, "MMM dd")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM dd, yyyy")}
            </div>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-200 rounded-full"
            >
              <RiArrowRightLine size={20} />
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Today
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span>Confirmed Booking</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span>Provisional Hold</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>Blocked by Restriction</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* Header Row */}
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Room
                </th>
                {weekDates.map((date) => (
                  <th key={date.toISOString()} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b min-w-[140px]">
                    <div className={`${isToday(date) ? 'text-indigo-600 font-semibold' : ''}`}>
                      {format(date, "EEE dd/MM")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rooms.map((room: Room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r">
                    <div>
                      <div className="font-medium">{room.name}</div>
                      <div className="text-xs text-gray-500">Base: €{room.price}</div>
                    </div>
                  </td>
                  {weekDates.map((date) => {
                    const priceInfo = getPriceForRoomAndDate(room.id, date);
                    const bookingStatus = getBookingStatus(room.id, date);
                    const statusColorClass = getStatusColorClass(bookingStatus);
                    
                    return (
                      <td key={`${room.id}-${date.toISOString()}`} className="px-2 py-2">
                        <div
                          onClick={() => handleCellClick(room, date)}
                          className={`
                            ${statusColorClass}
                            border-2 rounded-lg p-2 cursor-pointer hover:shadow-md transition-all
                            ${priceInfo.hasCustomPrice ? 'ring-2 ring-indigo-300' : ''}
                          `}
                        >
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              €{priceInfo.price}
                            </div>
                            {priceInfo.hasCustomPrice && (
                              <div className="text-xs mt-1">
                                {priceInfo.type === 'BASE_OVERRIDE' && 'Base Override'}
                                {priceInfo.type === 'ROOM_INCREASE' && `+€${priceInfo.price - room.price}`}
                                {priceInfo.type === 'ROOM_OVERRIDE' && 'Override'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modals */}
        {modalType === 'base' && selectedCell && (
          <BasePriceOverrideModal
            ratePolicy={ratePolicy}
            room={selectedCell.room}
            date={selectedCell.date}
            onClose={() => {
              setModalType(null);
              setSelectedCell(null);
            }}
            onUpdate={handlePriceUpdate}
          />
        )}

        {modalType === 'increase' && selectedCell && (
          <RoomPriceIncreaseModal
            ratePolicy={ratePolicy}
            room={selectedCell.room}
            date={selectedCell.date}
            onClose={() => {
              setModalType(null);
              setSelectedCell(null);
            }}
            onUpdate={handlePriceUpdate}
          />
        )}

        {modalType === 'override' && selectedCell && (
          <RoomPriceOverrideModal
            ratePolicy={ratePolicy}
            room={selectedCell.room}
            date={selectedCell.date}
            onClose={() => {
              setModalType(null);
              setSelectedCell(null);
            }}
            onUpdate={handlePriceUpdate}
            onSwitchModal={(type) => setModalType(type)}
          />
        )}
      </div>
    </div>
  );
}