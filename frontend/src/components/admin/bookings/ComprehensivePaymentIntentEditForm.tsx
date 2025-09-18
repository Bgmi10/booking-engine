import { useState, useEffect } from 'react';
import { Save, Plus, Minus, Calendar, Users, Building2, X } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import { useRooms } from '../../../hooks/useRooms';
import { useCalendarAvailability } from '../../../hooks/useCalendarAvailability';
import { useGeneralSettings } from '../../../hooks/useGeneralSettings';
import DateSelector from '../../DateSelector';``
import toast from 'react-hot-toast';

interface BookingEditData {
  id: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  hasExtraBed: boolean;
  extraBedCount: number;
  totalAmount?: number;
  originalRoomId?: string; // Track if room changed
}

interface ComprehensivePaymentIntentEditFormProps {
  paymentIntent: any;
  onClose: () => void;
  onUpdate: () => void;
  isReadOnly?: boolean;
  changedFields?: string[];
  readOnlyTitle?: string;
}

export default function ComprehensivePaymentIntentEditForm({ 
  paymentIntent, 
  onClose, 
  onUpdate,
  isReadOnly = false,
  changedFields = [],
  readOnlyTitle = 'Previous Booking State'
}: ComprehensivePaymentIntentEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState(paymentIntent.adminNotes || '');
  const [showCancellationFeeDialog, setShowCancellationFeeDialog] = useState(false);
  const [pendingRemovalIndex, setPendingRemovalIndex] = useState<number | null>(null);
  const [keepCancellationFee, setKeepCancellationFee] = useState(false);
  const [calendarOpenStates, setCalendarOpenStates] = useState<{[key: string]: boolean}>({});
  
  // Use rooms hook
  const { rooms: availableRooms, loadingRooms, fetchRoomsAndPricing } = useRooms();
  
  // Use calendar availability hook
  const { fetchCalendarAvailability, loading: isLoadingAvailability } = useCalendarAvailability();
  
  // Use general settings hook
  const { settings } = useGeneralSettings();
  
  // Availability data state
  const [availabilityData, setAvailabilityData] = useState({
    fullyBookedDates: [],
    partiallyBookedDates: [],
    availableDates: [],
    minStayDays: 0,
    taxPercentage: 0.1,
    restrictedDates: [],
    dateRestrictions: {}
  });
  
  // Parse booking data
  const [bookings, setBookings] = useState<BookingEditData[]>(() => {
    try {
      const bookingData = typeof paymentIntent.bookingData === 'string' 
        ? JSON.parse(paymentIntent.bookingData) 
        : paymentIntent.bookingData;
      
      return bookingData.map((booking: any, index: number) => ({
        id: paymentIntent.bookings?.[index]?.id || `temp-${index}`,
        roomId: booking.roomDetails?.id || booking.roomId || '',
        roomName: booking.roomDetails?.name || 'Unknown Room',
        checkIn: booking.checkIn?.split('T')[0] || '',
        checkOut: booking.checkOut?.split('T')[0] || '',
        totalGuests: booking.adults || booking.totalGuests || 1,
        hasExtraBed: booking.hasExtraBed || false,
        extraBedCount: booking.extraBedCount || 0,
        totalAmount: booking.totalPrice || 0,
        originalRoomId: booking.roomDetails?.id || booking.roomId || '',
      }));
    } catch {
      return [];
    }
  });

  // Fetch available rooms using the hook
  useEffect(() => {
    fetchRoomsAndPricing();
  }, [fetchRoomsAndPricing]);

  // Fetch calendar availability data
  const fetchAvailability = async (startDate: string, endDate: string) => {
    try {
      const calendarData = await fetchCalendarAvailability({
        startDate,
        endDate,
        showError: true,
        cacheEnabled: false // Disable cache for admin panel
      });
      
      if (calendarData) {
        setAvailabilityData(prev => ({
          ...prev,
          ...calendarData,
          minStayDays: calendarData.generalSettings?.[0]?.minStayDays || 2,
          taxPercentage: calendarData.generalSettings?.[0]?.taxPercentage || 0.1,
        }));
      }
    } catch (e) {
      console.error('Error fetching availability:', e);
      setAvailabilityData({
        fullyBookedDates: [],
        partiallyBookedDates: [],
        availableDates: [],
        minStayDays: 0,
        taxPercentage: 0.1,
        restrictedDates: [],
        dateRestrictions: {}
      });
    }
  };

  // Helper function to check if a field was changed
  const isFieldChanged = (fieldName: string) => {
    return changedFields.includes(fieldName);
  };

  // Helper function to get field styling based on change status
  const getFieldStyling = (fieldName: string, baseClasses: string) => {
    const changedClasses = isFieldChanged(fieldName) 
      ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-400' 
      : '';
    return `${baseClasses} ${changedClasses}`;
  };

  // Helper function to format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const updateBooking = (index: number, field: keyof BookingEditData, value: any) => {
    const updatedBookings = [...bookings];
    updatedBookings[index] = { ...updatedBookings[index], [field]: value };
    
    // If room changed, update room name
    if (field === 'roomId') {
      const room = availableRooms.find(r => r.id === value);
      if (room) {
        updatedBookings[index].roomName = room.name;
      }
    }
    
    setBookings(updatedBookings);
  };

  // Handler for date selection from DateSelector
  const handleDateSelect = (index: number, dates: { startDate: Date | null; endDate: Date | null }) => {
    // The DateSelector will call this with the new dates
    // We accept any dates that are passed, including when user clicks Confirm
    const checkIn = dates.startDate ? dates.startDate.toISOString().split('T')[0] : bookings[index].checkIn;
    const checkOut = dates.endDate ? dates.endDate.toISOString().split('T')[0] : bookings[index].checkOut;
    
    // Update the bookings state directly with the new dates
    setBookings(prev => prev.map((booking, i) => {
      if (i === index) {
        return {
          ...booking,
          checkIn: checkIn,
          checkOut: checkOut
        };
      }
      return booking;
    }));
    
    // Close the calendar for this booking
    setCalendarOpenStates(prev => ({ ...prev, [index]: false }));
  };

  // Handler to open calendar and fetch availability
  const handleOpenCalendar = (index: number) => {
    setCalendarOpenStates(prev => ({ ...prev, [index]: true }));
    
    // Determine which months to fetch based on existing booking dates or current date
    const booking = bookings[index];
    let startDate: Date;
    let endDate: Date;
    
    if (booking.checkIn) {
      // If booking has dates, fetch the month of check-in and next month
      const checkInDate = new Date(booking.checkIn);
      startDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1);
      endDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth() + 2, 0);
    } else {
      // Otherwise use current month
      const today = new Date();
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    }
    
    const formatDateForAPI = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    fetchAvailability(formatDateForAPI(startDate), formatDateForAPI(endDate));
  };

  const addBooking = () => {
    const newBooking: BookingEditData = {
      id: `new-${Date.now()}`,
      roomId: '',
      roomName: '',
      checkIn: '',
      checkOut: '',
      totalGuests: 1,
      hasExtraBed: false,
      extraBedCount: 0,
      totalAmount: 0,
    };
    setBookings([...bookings, newBooking]);
  };

  const handleRemoveBookingClick = (index: number) => {
    if (bookings.length > 1) {
      setPendingRemovalIndex(index);
      setShowCancellationFeeDialog(true);
    } else {
      toast.error('At least one booking is required');
    }
  };

  const removeBooking = (index: number) => {
    const bookingToRemove = bookings[index];
    const updatedBookings = bookings.filter((_, i) => i !== index);
    
    // If keeping cancellation fee, add the charge amount to remaining bookings or payment intent
    if (keepCancellationFee && bookingToRemove.totalAmount) {
      // Store the cancellation fee info in the booking data
      const bookingDataToUpdate = updatedBookings.map((b, idx) => {
        if (idx === 0) {
          // Add cancellation fee info to the first remaining booking
          return {
            ...b,
            cancellationFees: [
              //@ts-ignore
              ...(b.cancellationFees || []),
              {
                roomName: bookingToRemove.roomName,
                amount: bookingToRemove.totalAmount,
                date: new Date().toISOString()
              }
            ]
          };
        }
        return b;
      });
      setBookings(bookingDataToUpdate);
    } else {
      setBookings(updatedBookings);
    }
    
    setShowCancellationFeeDialog(false);
    setPendingRemovalIndex(null);
    setKeepCancellationFee(false);
  };

  const calculateTotalAmount = () => {
    return bookings.reduce((total, booking) => total + (booking.totalAmount || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for the changes');
      return;
    }

    // Validate bookings
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      if (!booking.roomId || !booking.checkIn || !booking.checkOut) {
        toast.error(`Booking ${i + 1}: Please fill all required fields`);
        return;
      }
      if (new Date(booking.checkIn) >= new Date(booking.checkOut)) {
        toast.error(`Booking ${i + 1}: Check-out date must be after check-in date`);
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${baseUrl}/admin/payment-intent/${paymentIntent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          bookings: bookings.map(b => {
            // Remove the cancellationFees from the booking data as it's handled separately
            const { cancellationFees, ...bookingData } = b as any;
            return bookingData;
          }),
          adminNotes,
          reason: reason.trim(),
          totalAmount: calculateTotalAmount(),
          cancellationFees: bookings.reduce((fees: any[], b: any) => {
            if (b.cancellationFees) {
              return [...fees, ...b.cancellationFees];
            }
            return fees;
          }, [])
        }),
      });

      if (response.ok) {
        toast.success('PaymentIntent updated successfully');
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update PaymentIntent');
      }
    } catch (error) {
      console.error('Error updating PaymentIntent:', error);
      toast.error('An error occurred while updating');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingRooms) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading rooms...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isReadOnly ? readOnlyTitle : 'Edit Booking Details'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Changed Fields Notice for Read-only mode */}
        {isReadOnly && changedFields.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm font-medium text-yellow-800 mb-1.5">Fields that were changed:</p>
            <div className="flex flex-wrap gap-1">
              {changedFields.map((field: string, index: number) => (
                <span key={index} className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs font-medium">
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reason Field - Only show in edit mode */}
        {!isReadOnly && (
          <div>
            <label htmlFor="reason" className="block text-xs font-medium text-gray-700 mb-1.5">
              Reason for Changes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              rows={2}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Please provide a reason for these changes..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        )}

        {/* Bookings Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-900">Room Bookings</h3>
            {!isReadOnly && (
              <button
                type="button"
                onClick={addBooking}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-3 w-3 mr-0.5" />
                Add Room
              </button>
            )}
          </div>

          <div className="space-y-3">
            {bookings.map((booking, index) => (
              <div key={booking.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-xs font-medium text-gray-900">Room {index + 1}</h4>
                  {bookings.length > 1 && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBookingClick(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  )}
                </div>

      {/* Grid for fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Room Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Building2 className="inline h-3 w-3 mr-0.5" />
            Room <span className="text-red-500">*</span>
          </label>
          <select
            value={booking.roomId}
            onChange={(e) =>
              !isReadOnly && updateBooking(index, "roomId", e.target.value)
            }
            className={getFieldStyling(
              "roomId",
              `w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                isReadOnly ? "bg-gray-50 cursor-not-allowed" : ""
              }`
            )}
            required={!isReadOnly}
            disabled={isReadOnly}
          >
            <option value="">Select a room</option>
            {availableRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} (Capacity: {room.capacity})
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Calendar className="inline h-3 w-3 mr-0.5" />
            Check-in / Check-out <span className="text-red-500">*</span>
          </label>
          {!isReadOnly ? (
            <>
              <button
                type="button"
                className={getFieldStyling(
                  "checkIn",
                  `w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between`
                )}
                onClick={() => handleOpenCalendar(index)}
              >
                <span>
                  {booking.checkIn && booking.checkOut
                    ? `${formatDateDisplay(booking.checkIn)} - ${formatDateDisplay(
                        booking.checkOut
                      )}`
                    : "Select dates"}
                </span>
                <Calendar className="h-3 w-3 text-gray-500" />
              </button>
              <DateSelector
                minStayDays={availabilityData.minStayDays || 2}
                dailyBookingStartTime={settings?.dailyBookingStartTime}
                calenderOpen={calendarOpenStates[index] || false}
                setCalenderOpen={(open) =>
                  setCalendarOpenStates((prev) => ({ ...prev, [index]: open }))
                }
                onSelect={(dates) => handleDateSelect(index, dates)}
                availabilityData={availabilityData}
                isLoadingAvailability={isLoadingAvailability}
                onFetchAvailability={fetchAvailability}
                selectedRoomId={booking.roomId}
                isHide={true}
              />
            </>
          ) : (
            <div
              className={getFieldStyling(
                "checkIn",
                `w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm bg-gray-50 flex items-center justify-between`
              )}
            >
              <span>
                {booking.checkIn && booking.checkOut
                  ? `${formatDateDisplay(booking.checkIn)} - ${formatDateDisplay(
                      booking.checkOut
                    )}`
                  : "No dates selected"}
              </span>
              <Calendar className="h-3 w-3 text-gray-400" />
            </div>
          )}
        </div>

        {/* Total Guests */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Users className="inline h-3 w-3 mr-0.5" />
            Total Guests <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={booking.totalGuests}
            onChange={(e) =>
              !isReadOnly &&
              updateBooking(index, "totalGuests", parseInt(e.target.value) || 1)
            }
            className={getFieldStyling(
              "totalGuests",
              `w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                isReadOnly ? "bg-gray-50 cursor-not-allowed" : ""
              }`
            )}
            required={!isReadOnly}
            disabled={isReadOnly}
          />
        </div>

        {/* Extra Bed */}
        {availableRooms.find((r) => r.id === booking.roomId)?.allowsExtraBed && (
          <>
            <div>
              <label className="flex items-center text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={booking.hasExtraBed}
                  onChange={(e) =>
                    updateBooking(index, "hasExtraBed", e.target.checked)
                  }
                  className="mr-1.5"
                  disabled={isReadOnly}
                />
                Extra Bed
              </label>
            </div>
            
            {booking.hasExtraBed && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Extra Bed Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="2"
                  value={booking.extraBedCount}
                  onChange={(e) =>
                    updateBooking(
                      index,
                      "extraBedCount",
                      parseInt(e.target.value) || 1
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isReadOnly}
                />
              </div>
            )}
          </>
        )}

        {/* Total Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Total Amount (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={booking.totalAmount}
            onChange={(e) =>
              updateBooking(index, "totalAmount", parseFloat(e.target.value) || 0)
            }
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            disabled={isReadOnly}
          />
        </div>
      </div>
    </div>
  ))}
</div>

        </div>

        {/* Total Summary */}
        <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900">Total Amount:</span>
            <span className="text-lg font-semibold text-blue-900">€{calculateTotalAmount().toFixed(2)}</span>
          </div>
        </div>

        {/* Admin Notes */}
        <div>
          <label htmlFor="adminNotes" className="block text-xs font-medium text-gray-700 mb-1.5">
            Admin Notes
          </label>
          <textarea
            id="adminNotes"
            rows={2}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any internal notes about this PaymentIntent..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1.5" />
                  Update Booking Details
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Cancellation Fee Dialog */}
      {showCancellationFeeDialog && pendingRemovalIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Remove Room Booking
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You are about to remove:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="font-medium text-sm text-gray-900">
                  {bookings[pendingRemovalIndex].roomName}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Amount: €{bookings[pendingRemovalIndex].totalAmount?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                Apply 100% cancellation fee?
              </p>
              <p className="text-xs text-amber-700">
                If yes, the room charge will be kept as a cancellation fee even though the room is removed.
              </p>
            </div>

            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                id="keep-cancellation-fee"
                checked={keepCancellationFee}
                onChange={(e) => setKeepCancellationFee(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="keep-cancellation-fee" className="ml-2 text-sm text-gray-700">
                Apply 100% cancellation fee (€{bookings[pendingRemovalIndex].totalAmount?.toFixed(2) || '0.00'})
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCancellationFeeDialog(false);
                  setPendingRemovalIndex(null);
                  setKeepCancellationFee(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingRemovalIndex !== null) {
                    removeBooking(pendingRemovalIndex);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Remove Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}