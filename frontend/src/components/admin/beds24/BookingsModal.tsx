import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiDownloadLine, RiCheckLine, RiTimeLine, RiAlertLine } from 'react-icons/ri';
import { BiLoader } from 'react-icons/bi';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { baseUrl } from '../../../utils/constants';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { isValid } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Beds24Booking {
  bookId: string;
  propId: string;
  roomId: string;
  arrival: string;
  departure: string;
  numAdult: number;
  numChild: number;
  guestFirstName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  price: number;
  commission: number;
  apiReference: string;
  bookingTime: string;
  status: string;
  payStatus: string;
  guestComments: string;
}

interface BookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingsModal({ isOpen, onClose }: BookingsModalProps) {
  const [bookings, setBookings] = useState<Beds24Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen, startDate, endDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`${baseUrl}/admin/beds24/bookings?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const importSelectedBookings = async () => {
    if (selectedBookings.length === 0) {
      toast.error('Please select bookings to import');
      return;
    }

    setImporting(true);
    try {
      // In a real implementation, this would process each booking
      for (const bookId of selectedBookings) {
        const booking = bookings.find(b => b.bookId === bookId);
        if (booking) {
          // Process booking webhook
          await fetch(`${baseUrl}/admin/beds24/webhook/booking`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(booking),
          });
        }
      }
      
      toast.success(`Successfully imported ${selectedBookings.length} booking(s)`);
      setSelectedBookings([]);
    } catch (error) {
      console.error('Failed to import bookings:', error);
      toast.error('Failed to import bookings');
    } finally {
      setImporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '0': return 'bg-yellow-100 text-yellow-800';
      case '1': return 'bg-green-100 text-green-800';
      case '2': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '0': return 'Pending';
      case '1': return 'Confirmed';
      case '2': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Beds24 Bookings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booking Period
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => {
                    if (date && isValid(date)) {
                      setStartDate(date);
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
                  End Date
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => {
                    if (date && isValid(date)) {
                      setEndDate(date);
                    }
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select end date"
                  minDate={startDate}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                />
              </div>
            </div>
          </div>
          <button
            onClick={fetchBookings}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <BiLoader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : bookings.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedBookings.length === bookings.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBookings(bookings.map(b => b.bookId));
                          } else {
                            setSelectedBookings([]);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.bookId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.bookId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookings([...selectedBookings, booking.bookId]);
                            } else {
                              setSelectedBookings(selectedBookings.filter(id => id !== booking.bookId));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.bookId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {booking.guestFirstName} {booking.guestName}
                          </p>
                          <p className="text-xs text-gray-500">{booking.guestEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">
                            {format(new Date(booking.arrival), 'dd/MM')} - {format(new Date(booking.departure), 'dd/MM')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.ceil((new Date(booking.departure).getTime() - new Date(booking.arrival).getTime()) / (1000 * 60 * 60 * 24))} nights
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.numAdult + booking.numChild}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">€{booking.price}</p>
                          {booking.commission > 0 && (
                            <p className="text-xs text-gray-500">Commission: €{booking.commission}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-between items-center">
              <p className="text-sm text-gray-700">
                {selectedBookings.length} of {bookings.length} selected
              </p>
              <button
                onClick={importSelectedBookings}
                disabled={importing || selectedBookings.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <BiLoader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RiDownloadLine className="w-4 h-4 mr-2" />
                )}
                Import Selected Bookings
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <RiAlertLine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No bookings found for the selected date range</p>
          </div>
        )}
      </div>
    </div>
  );
}