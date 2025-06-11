import { useEffect, useState, useMemo } from "react";
import { Calendar, Users, Euro, Lock, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { baseUrl } from "../../../utils/constants";

export default function Occupancy({ bookings }: { bookings: any }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllRooms = async () => {
    try {
      const res = await fetch(baseUrl + "/admin/rooms/all", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      });
      const data = await res.json();
      setRooms(data.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRooms();
  }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDays, setViewDays] = useState(14); // Default to 2 weeks view

  // Virtual scrolling configuration
  const CELL_WIDTH = 120;
  const ROW_HEIGHT = 80;

  // Generate optimized date range based on current view
  const dateRange = useMemo(() => {
    const dates = [];
    const startDate = new Date(currentDate);
    
    for (let i = 0; i < viewDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate, viewDays]);

  // Optimized booking calculations with memoization
  const processedBookings = useMemo(() => {
    if (!bookings) return [];
    
    const timelineStart: any = dateRange[0];
    const timelineEnd: any = dateRange[dateRange.length - 1];
    
    return bookings
      .filter((booking: any) => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        // Only process bookings that intersect with current view
        return checkOut >= timelineStart && checkIn <= timelineEnd;
      })
      .map((booking: any) => {
        const checkIn: any = new Date(booking.checkIn);
        const checkOut: any= new Date(booking.checkOut);
        
        // Calculate visible portion of booking
        const visibleStart = Math.max(checkIn, timelineStart);
        const visibleEnd = Math.min(checkOut, timelineEnd);
        
        const startDiff = Math.floor((visibleStart - timelineStart) / (1000 * 60 * 60 * 24));
        const duration = Math.floor((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24));
        
        return {
          ...booking,
          startPos: Math.max(0, startDiff),
          width: Math.max(1, duration),
          isPartial: checkIn < timelineStart || checkOut > timelineEnd
        };
      });
  }, [bookings, dateRange]);

  // Navigation functions
  const navigateWeeks = (direction: any) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * viewDays));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date for display
  const formatDateHeader = (date: any) => {
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' })
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header with Navigation */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Room Occupancy</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Options */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => setViewDays(days)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewDays === days 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => navigateWeeks(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              
              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <Home className="h-4 w-4" />
                Today
              </button>
              
              <button
                onClick={() => navigateWeeks(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Fixed Room Column */}
        <div className="w-72 bg-slate-50/50 border-r border-gray-100 flex-shrink-0">
          {/* Column Header */}
          <div className="px-6 py-4 font-medium text-gray-700 border-b border-gray-100 bg-gray-50/50">
            Rooms ({rooms.length})
          </div>
          
          {/* Room List */}
          <div className="max-h-96 overflow-y-auto">
            {rooms.map((room: any) => (
              <div key={room.id} className="px-6 py-4 border-b border-gray-50 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {room.name}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Euro className="h-3 w-3" />
                      {room.price}/night
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ minWidth: `${dateRange.length * CELL_WIDTH}px` }}>
            {/* Timeline Header */}
            <div className="flex bg-gray-50/50 border-b border-gray-100 sticky top-0 z-20">
              {dateRange.map((date, index) => {
                const formatted = formatDateHeader(date);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={index} 
                    className={`flex-shrink-0 px-3 text-center border-r border-gray-100 ${
                      isToday ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    style={{ width: `${CELL_WIDTH}px` }}
                  >
                    <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {formatted.day}
                    </div>
                    <div className={`text-md font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {formatted.date}
                    </div>
                    <div className={`text-xs ${isToday ? 'text-blue-500' : 'text-gray-500'}`}>
                      {formatted.month}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline Rows */}
            <div className="relative">
              {rooms.map((room: any) => {
                const roomBookings = processedBookings.filter((booking: any) => booking.roomId === room.id);
                
                return (
                  <div 
                    key={room.id} 
                    className="relative border-b border-gray-50 hover:bg-slate-50/30 transition-colors"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    {/* Background grid */}
                    <div className="flex absolute inset-0">
                      {dateRange.map((_, index) => (
                        <div 
                          key={index} 
                          className="border-r border-gray-100/70 flex-shrink-0"
                          style={{ width: `${CELL_WIDTH}px` }}
                        />
                      ))}
                    </div>
                    
                    {/* Booking blocks */}
                    {roomBookings.map((booking: any) => (
                      <div
                        key={booking.id}
                        className={`absolute top-3 bottom-3 rounded-lg shadow-sm flex items-center px-3 text-white text-sm z-10 ${
                          booking.isPartial 
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500' 
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        } hover:shadow-md transition-shadow cursor-pointer`}
                        style={{
                          left: `${booking.startPos * CELL_WIDTH}px`,
                          width: `${booking.width * CELL_WIDTH - 4}px`,
                          minWidth: '120px'
                        }}
                        title={`${booking.guestFirstName} ${booking.guestLastName} - ${booking.totalGuests} guest${booking.totalGuests > 1 ? 's' : ''}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Lock className="h-3 w-3 flex-shrink-0 opacity-80" />
                          <div className="truncate">
                            <div className="font-medium text-sm">
                              {booking.guestFirstName} {booking.guestLastName}
                            </div>
                            <div className="text-xs opacity-90 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {booking.totalGuests}
                              </span>
                              <span className="flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                €{booking.metadata?.totalPrice || booking.room?.price}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Footer */}
      <div className="bg-slate-50/50 px-6 py-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-gray-600">Partial View</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>
              <span className="font-medium text-gray-900">{bookings?.length || 0}</span> Active Bookings
            </span>
            <span>
              <span className="font-medium text-gray-900">{rooms.length}</span> Total Rooms
            </span>
            <span>
              Viewing <span className="font-medium text-gray-900">{viewDays}</span> days
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}