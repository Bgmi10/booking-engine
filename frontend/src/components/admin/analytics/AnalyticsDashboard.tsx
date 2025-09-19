import { useState, useEffect, useMemo } from 'react';
import { format, addDays, isValid, isSameDay } from 'date-fns';
import { Calendar, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import { useRooms } from '../../../hooks/useRooms';
import type { Room, Booking } from '../../../types/types';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';

// Extended Booking interface for analytics with additional fields
interface AnalyticsBooking extends Booking {
  checkedIn?: boolean; // Legacy field
  checkedOut?: boolean; // Legacy field
  checkedInAt?: string;
  checkedOutAt?: string;
  reportedToPolice?: boolean;
  policeReportedAt?: string;
  policeReportError?: string;
  totalAmount?: number;
  customerId?: string;
  customer?: {
    id: string;
    guestFirstName: string;
    guestLastName: string;
    guestMiddleName?: string;
    guestEmail: string;
    guestPhone: string;
    guestNationality?: string;
  };
  guestCheckInAccess?: Array<{
    id: string;
    customerId: string;
    isMainGuest: boolean;
    customer: {
      passportNumber?: string;
      idCard?: string;
      guestNationality?: string;
      dob?: string;
      gender?: string;
    };
  }>;
}

// Extended Room interface with isActive field for filtering
interface AnalyticsRoom extends Room {
  isActive?: boolean;
}

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  avgDailyRate: number;
  policeReportingStats: {
    reported: number;
    pending: number;
    errors: number;
  };
}

export default function AnalyticsDashboard() {
  const [currentPeriodStart, setCurrentPeriodStart] = useState(new Date());
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(addDays(new Date(), 13)); // 2 weeks default
  const [bookings, setBookings] = useState<AnalyticsBooking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{room: AnalyticsRoom, date: Date, booking?: AnalyticsBooking} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Use the reusable rooms hook
  const { rooms, loadingRooms, fetchRoomsAndPricing } = useRooms({ showToastOnError: false });

  // Generate dates for the current period
  const periodDates = useMemo(() => {
    const dates = [];
    const diffTime = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 0; i < diffDays; i++) {
      dates.push(addDays(currentPeriodStart, i));
    }
    return dates;
  }, [currentPeriodStart, currentPeriodEnd]);

  // Filter rooms based on search
  const filteredRooms = rooms.filter((room: AnalyticsRoom) =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchBookings = async (startDate: Date, endDate: Date) => {
    try {
      const response = await fetch(
        `${baseUrl}/admin/bookings/all?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          credentials: 'include'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  };

  const calculateStats = (bookingsData: AnalyticsBooking[]): DashboardStats => {
    const totalBookings = bookingsData.length;
    const totalRevenue = bookingsData.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    
    // Calculate occupancy rate (simplified)
    const checkedInBookings = bookingsData.filter(b => b.checkedInAt).length;
    const occupancyRate = totalBookings > 0 ? (checkedInBookings / totalBookings) * 100 : 0;
    
    // Calculate average daily rate
    const avgDailyRate = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    
    // Police reporting stats
    const reportedCount = bookingsData.filter(b => b.reportedToPolice).length;
    const errorCount = bookingsData.filter(b => b.policeReportError).length;
    const pendingCount = bookingsData.filter(b => b.checkedInAt && !b.reportedToPolice).length;
    
    return {
      totalBookings,
      totalRevenue,
      occupancyRate,
      avgDailyRate,
      policeReportingStats: {
        reported: reportedCount,
        pending: pendingCount,
        errors: errorCount
      }
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      const [bookingsData] = await Promise.all([
        fetchBookings(currentPeriodStart, currentPeriodEnd),
        fetchRoomsAndPricing()
      ]);
      
      setBookings(bookingsData);
      setStats(calculateStats(bookingsData));
      setLoading(false);
    };
    
    loadData();
  }, [currentPeriodStart, currentPeriodEnd, fetchRoomsAndPricing]);

  // Get bookings for a specific room and date
  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(booking => {
      if (booking.room?.id !== roomId) return false;
      
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      const checkInStr = format(checkInDate, "yyyy-MM-dd");
      const checkOutStr = format(checkOutDate, "yyyy-MM-dd");
      
      // Check if date falls within booking period
      return dateStr >= checkInStr && dateStr < checkOutStr;
    });
  };

  // Handle cell click for editing/viewing booking details
  const handleCellClick = (room: AnalyticsRoom, date: Date) => {
    const roomBookings = getBookingsForRoomAndDate(room.id, date);
    const booking = roomBookings.length > 0 ? roomBookings[0] : undefined;
    
    setSelectedCell({ room, date, booking });
  };

  // Get booking status for a cell
  const getCellStatus = (roomId: string, date: Date) => {
    const roomBookings = getBookingsForRoomAndDate(roomId, date);
    if (roomBookings.length === 0) return 'available';
    
    const booking = roomBookings[0];
    const checkInDate = new Date(booking.checkIn);
    const isCheckInDay = format(date, "yyyy-MM-dd") === format(checkInDate, "yyyy-MM-dd");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDateOnly = new Date(checkInDate);
    checkInDateOnly.setHours(0, 0, 0, 0);
    
    if (booking.checkedOutAt) return 'checked_out';
    if (booking.checkedInAt) return 'checked_in';

    // Only check police data requirements on or after the check-in date
    if (isCheckInDay && checkInDateOnly <= today) {
      const hasCompletePoliceData = booking.guestCheckInAccess?.every(guest => 
        guest.customer.passportNumber || guest.customer.idCard
      );
      return hasCompletePoliceData ? 'ready_checkin' : 'missing_police_data';
    }

    // For future check-ins, just show as booked (not arrived)
    // For past check-in dates that haven't arrived, this will still show blue
    return 'not_arrived';
  };

  // Get cell styling based on status
  const getCellStyling = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'not_arrived':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'ready_checkin':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'missing_police_data':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'checked_in':
        return 'bg-pink-50 text-pink-800 border-pink-200';
      case 'checked_out':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-white text-gray-800 border-gray-200';
    }
  };

  // Police data revalidation handler
  const handlePoliceRevalidation = async (bookingId: string) => {
    // Find the current booking to check its status
    const currentBooking = bookings.find(b => b.id === bookingId);
    
    if (!currentBooking) {
      toast.error('Booking not found');
      return;
    }

    // Check if already validated/reported to prevent duplicates
    if (currentBooking.reportedToPolice) {
      toast.error('This booking has already been reported to police portal. Cannot revalidate.');
      return;
    }

    try {
      setRevalidating(true);
      
      const response = await fetch(
        `${baseUrl}/admin/bookings/${bookingId}/police-validation`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      if (response.ok) {
        toast.success('Police data validation completed successfully!');
        
        // Refresh the data
        const [bookingsData] = await Promise.all([
          fetchBookings(currentPeriodStart, currentPeriodEnd),
          fetchRoomsAndPricing()
        ]);
        
        setBookings(bookingsData);
        setStats(calculateStats(bookingsData));
        setSelectedCell(null);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.data?.message || errorData.message || 'Unknown error';
        const errors = errorData.data?.errors || [];
        
        if (errors.length > 0) {
          toast.error(`${errorMessage}: ${errors.join(', ')}`);
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Police validation error:', error);
      toast.error('Failed to validate police data. Please try again.');
    } finally {
      setRevalidating(false);
    }
  };

  // Report to police handler
  const handleReportToPolice = async (bookingId: string) => {
    // Find the current booking to check its status
    const currentBooking = bookings.find(b => b.id === bookingId);
    
    if (!currentBooking) {
      toast.error('Booking not found');
      return;
    }

    // Strictly prevent duplicate reports
    if (currentBooking.reportedToPolice) {
      toast.error('This booking has already been reported to police portal. Duplicate reports are not allowed.');
      return;
    }

    // Additional safety check - must be checked in first
    if (!currentBooking.checkedInAt) {
      toast.error('Booking must be checked in before reporting to police portal.');
      return;
    }

    try {
      setRevalidating(true);
      
      const response = await fetch(
        `${baseUrl}/admin/bookings/${bookingId}/police-report`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('Booking reported to police portal successfully!');
        
        // Refresh the data
        const [bookingsData] = await Promise.all([
          fetchBookings(currentPeriodStart, currentPeriodEnd),
          fetchRoomsAndPricing()
        ]);
        
        setBookings(bookingsData);
        setStats(calculateStats(bookingsData));
        setSelectedCell(null);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.data?.message || errorData.message || 'Unknown error';
        const errors = errorData.data?.errors || [];
        
        if (errors.length > 0) {
          toast.error(`${errorMessage}: ${errors.join(', ')}`);
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Police report error:', error);
      toast.error('Failed to report to police portal. Please try again.');
    } finally {
      setRevalidating(false);
    }
  };

  if (loading || loadingRooms) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
  
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">€{stats.totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Occupancy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Police OK</p>
                <p className="text-2xl font-bold text-gray-900">{stats.policeReportingStats.reported}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Police Errors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.policeReportingStats.errors}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          {/* Status Legends */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded-full"></div>
              <span className="text-sm text-gray-600">Not Arrived</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-50 border border-green-200 rounded-full"></div>
              <span className="text-sm text-gray-600">Ready Check-in</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-50 border border-red-200 rounded-full"></div>
              <span className="text-sm text-gray-600">Missing Police Data</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-pink-50 border border-pink-200 rounded-full"></div>
              <span className="text-sm text-gray-600">Checked In</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded-full"></div>
              <span className="text-sm text-gray-600">Checked Out</span>
            </div>
          </div>
          
          {/* Date Range Controls */}
          <div className="flex items-center space-x-3 z-50">
            <span className="text-sm font-semibold text-gray-700">Date Range</span>
            <div className="flex items-center space-x-2">
              <DatePicker
                selected={currentPeriodStart}
                onChange={(date: Date | null) => {
                  if (date && isValid(date)) {
                    setCurrentPeriodStart(date);
                  }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Start date"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
              />
              <span className="text-gray-500 text-sm">to</span>
              <DatePicker
                selected={currentPeriodEnd}
                onChange={(date: Date | null) => {
                  if (date && isValid(date)) {
                    setCurrentPeriodEnd(date);
                  }
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="End date"
                minDate={currentPeriodStart}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rooms..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr>
                {/* Room Header Column */}
                <th className="sticky left-0 bg-white z-20 border-r border-b border-gray-200 px-6 py-4 text-left w-[240px]">
                  <span className="text-sm font-semibold text-gray-700">Room</span>
                </th>
                {/* Date Headers */}
                {periodDates.map((date) => (
                  <th key={date.toISOString()} className="border-b border-gray-200 px-3 py-4 text-center w-[100px]">
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
              {filteredRooms.map((room: AnalyticsRoom, index: number) => (
                <tr key={room.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {/* Room Info Column */}
                  <td className="sticky left-0 bg-inherit z-10 border-r border-b border-gray-200 px-6 py-4 w-[240px]">
                    <div className="font-medium text-gray-900">{room.name}</div>
                  </td>
                  {/* Date Cells */}
                  {(() => {
                    const cells = [];
                    const processedBookings = new Set();
                    
                    for (let i = 0; i < periodDates.length; i++) {
                      const date = periodDates[i];
                      const roomBookings = getBookingsForRoomAndDate(room.id, date);
                      const booking = roomBookings.length > 0 ? roomBookings[0] : null;
                      const isToday = isSameDay(date, new Date());
                      
                      // If this booking has already been processed as a span, skip
                      if (booking && processedBookings.has(booking.id)) {
                        continue;
                      }
                      
                      if (booking) {
                        const checkOutDate = new Date(booking.checkOut);
                        
                        // Find start and end indices within the current period
                     
                        const endIndex = periodDates.findIndex(d => 
                          format(d, 'yyyy-MM-dd') === format(checkOutDate, 'yyyy-MM-dd')
                        );
                        
                        const visibleEndIndex = endIndex >= 0 ? Math.min(endIndex - 1, periodDates.length - 1) : periodDates.length - 1;
                        const span = visibleEndIndex - i + 1;
                        
                        if (span > 0) {
                          const status = getCellStatus(room.id, date);
                          const stylingClass = getCellStyling(status);
                          
                          processedBookings.add(booking.id);
                          
                          cells.push(
                            <td
                              key={`${room.id}-${booking.id}-${date.toISOString()}`}
                              colSpan={span}
                              className={`border-b border-gray-200 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all ${stylingClass} ${
                                isToday ? 'ring-2 ring-yellow-400' : ''
                              }`}
                              onClick={() => handleCellClick(room, date)}
                            >
                              <div className="py-3 px-2 relative">
                                <div>
                                  <div className="text-xs font-medium truncate">
                                    {booking.customer ? `${booking.customer.guestFirstName} ${booking.customer.guestLastName}` : 'Guest'}
                                  </div>
                                 
                                  {booking.policeReportError && (
                                    <div className="absolute top-1 right-1">
                                      <AlertTriangle className="h-3 w-3 text-red-600" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                          
                          // Skip the days covered by this span
                          i += span - 1;
                        }
                      } else {
                        // Empty cell
                        const status = getCellStatus(room.id, date);
                        const stylingClass = getCellStyling(status);
                        
                        cells.push(
                          <td
                            key={`${room.id}-${date.toISOString()}`}
                            className={`border-b border-gray-200 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all ${stylingClass} ${
                              isToday ? 'ring-2 ring-yellow-400' : ''
                            } w-[100px]`}
                            onClick={() => handleCellClick(room, date)}
                          >
                            <div className="py-3 px-2 relative">
                              <div className="text-xs text-gray-400">—</div>
                            </div>
                          </td>
                        );
                      }
                    }
                    
                    return cells;
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Details Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedCell.room.name} - {format(selectedCell.date, 'EEE, MMM d, yyyy')}
            </h3>
            
            {selectedCell.booking ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Guest:</span>
                  <p className="text-gray-900">
                    {selectedCell.booking.customer ? 
                      `${selectedCell.booking.customer.guestFirstName} ${selectedCell.booking.customer.guestLastName}` : 
                      'Unknown Guest'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Guests:</span>
                  <p className="text-gray-900">{selectedCell.booking.totalGuests}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <p className="text-gray-900 capitalize">{getCellStatus(selectedCell.room.id, selectedCell.date).replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Police Report Status:</span>
                  <p className={`text-sm font-medium ${
                    selectedCell.booking.reportedToPolice 
                      ? 'text-green-700' 
                      : selectedCell.booking.policeReportError 
                      ? 'text-red-700' 
                      : 'text-yellow-700'
                  }`}>
                    {selectedCell.booking.reportedToPolice 
                      ? '✅ Reported to Police Portal' 
                      : selectedCell.booking.policeReportError 
                      ? '❌ Report Failed' 
                      : '⏳ Not Reported Yet'
                    }
                  </p>
                </div>
                {selectedCell.booking.totalAmount && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                    <p className="text-gray-900">€{selectedCell.booking.totalAmount}</p>
                  </div>
                )}
                {selectedCell.booking.policeReportError && (
                  <div>
                    <span className="text-sm font-medium text-red-600">Police Error:</span>
                    <p className="text-red-800 text-sm">{selectedCell.booking.policeReportError}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No booking for this date</p>
            )}
            
            <div className="flex justify-between items-center mt-6">
              {/* Action Buttons */}
              {selectedCell.booking && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePoliceRevalidation(selectedCell.booking!.id)}
                    disabled={revalidating || selectedCell.booking.reportedToPolice}
                    className={`px-3 py-2 text-white rounded-lg transition-colors text-sm ${
                      selectedCell.booking.reportedToPolice 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                    }`}
                    title={selectedCell.booking.reportedToPolice ? 'Already reported to police portal' : ''}
                  >
                    {selectedCell.booking.reportedToPolice 
                      ? 'Already Reported' 
                      : (revalidating ? 'Validating...' : 'Revalidate Police Data')
                    }
                  </button>
                  <button
                    onClick={() => handleReportToPolice(selectedCell.booking!.id)}
                    disabled={revalidating || selectedCell.booking.reportedToPolice || !selectedCell.booking.checkedInAt}
                    className={`px-3 py-2 text-white rounded-lg transition-colors text-sm ${
                      selectedCell.booking.reportedToPolice || !selectedCell.booking.checkedInAt
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                    }`}
                    title={
                      selectedCell.booking.reportedToPolice 
                        ? 'Already reported to police portal' 
                        : !selectedCell.booking.checkedInAt 
                        ? 'Must be checked in first'
                        : ''
                    }
                  >
                    {selectedCell.booking.reportedToPolice 
                      ? 'Already Reported' 
                      : !selectedCell.booking.checkedInAt 
                      ? 'Not Checked In'
                      : (revalidating ? 'Reporting...' : 'Report to Police')
                    }
                  </button>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex space-x-2">
                {selectedCell.booking?.paymentIntentId && (
                  <button
                    onClick={() => {
                      window.location.search = `?sidebar=bookings&paymentIntentId=${selectedCell.booking!.paymentIntentId}`;
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    View Details
                  </button>
                )}
                <button
                  onClick={() => setSelectedCell(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}