import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Heart,
  Award,
} from 'lucide-react';
import { baseUrl } from '../../../utils/constants';

interface CustomerAnalytics {
  customerId: string;
  customerName: string;
  email: string;
  firstBookingDate: string;
  lastBookingDate: string;
  totalSpent: number;
  totalBookings: number;
  yearsWithUs: number;
  avgSpendingPerBooking: number;
  yearlySpending: Array<{
    year: number;
    amount: number;
    bookings: number;
  }>;
  relatedCustomers: Array<{
    id: string;
    name: string;
    relationship: string;
    totalSpent: number;
  }>;
  favoriteRooms: Array<{
    roomName: string;
    bookingCount: number;
    totalSpent: number;
  }>;
  seasonalPreference: Array<{
    month: string;
    bookingCount: number;
  }>;
}

interface CustomerAnalyticsProps {
  customerId?: string;
  onCustomerSelect?: (customerId: string) => void;
}

export default function CustomerAnalytics({ customerId, onCustomerSelect }: CustomerAnalyticsProps) {
  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewType, setViewType] = useState<'overview' | 'yearly' | 'relationships'>('overview');

  const fetchCustomerAnalytics = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/admin/customers/${id}/analytics`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomerData(data.data);
      }
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerAnalytics(customerId);
    }
  }, [customerId]);

  if (!customerId) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Analytics</h3>
        <p className="text-gray-500">Select a customer to view detailed analytics and spending history.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-red-500">Failed to load customer analytics</div>
      </div>
    );
  }

  const currentYearData = customerData.yearlySpending.find(ys => ys.year === selectedYear);
  const availableYears = customerData.yearlySpending.map(ys => ys.year).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{customerData.customerName}</h2>
            <p className="text-gray-600">{customerData.email}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Customer since {format(new Date(customerData.firstBookingDate), 'MMM yyyy')}
              </span>
              <span className="flex items-center">
                <Heart className="h-4 w-4 mr-1" />
                {customerData.yearsWithUs} years with us
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setViewType('overview')}
              className={`px-4 py-2 text-sm rounded-md ${
                viewType === 'overview' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewType('yearly')}
              className={`px-4 py-2 text-sm rounded-md ${
                viewType === 'yearly' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setViewType('relationships')}
              className={`px-4 py-2 text-sm rounded-md ${
                viewType === 'relationships' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Relationships
            </button>
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {viewType === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">€{customerData.totalSpent.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{customerData.totalBookings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg per Booking</p>
                  <p className="text-2xl font-bold text-gray-900">€{customerData.avgSpendingPerBooking.toFixed(0)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Loyalty</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customerData.yearsWithUs >= 5 ? 'VIP' : 
                     customerData.yearsWithUs >= 2 ? 'Gold' : 'Silver'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending Trend */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Year</h3>
              <div className="space-y-3">
                {customerData.yearlySpending.map(yearData => (
                  <div key={yearData.year} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900 w-12">{yearData.year}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{
                            width: `${(yearData.amount / Math.max(...customerData.yearlySpending.map(y => y.amount))) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">€{yearData.amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{yearData.bookings} bookings</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Favorite Rooms */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Favorite Rooms</h3>
              <div className="space-y-3">
                {customerData.favoriteRooms.slice(0, 5).map(room => (
                  <div key={room.roomName} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{room.roomName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{room.bookingCount} times</div>
                      <div className="text-xs text-gray-500">€{room.totalSpent.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Seasonal Preferences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Patterns</h3>
            <div className="grid grid-cols-12 gap-1">
              {customerData.seasonalPreference.map(month => {
                const maxBookings = Math.max(...customerData.seasonalPreference.map(m => m.bookingCount));
                const height = maxBookings > 0 ? (month.bookingCount / maxBookings) * 100 : 0;
                
                return (
                  <div key={month.month} className="text-center">
                    <div className="mb-2 flex items-end justify-center" style={{ height: '60px' }}>
                      <div 
                        className="bg-blue-500 rounded-t w-full min-h-1"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${month.month}: ${month.bookingCount} bookings`}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">{month.month.substr(0, 3)}</div>
                    <div className="text-xs font-medium text-gray-900">{month.bookingCount}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Yearly Tab */}
      {viewType === 'yearly' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Yearly Analysis</h3>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {currentYearData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <h4 className="text-2xl font-bold text-blue-600">€{currentYearData.amount.toLocaleString()}</h4>
                  <p className="text-sm text-gray-600">Total Spent in {selectedYear}</p>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <h4 className="text-2xl font-bold text-green-600">{currentYearData.bookings}</h4>
                  <p className="text-sm text-gray-600">Bookings in {selectedYear}</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <h4 className="text-2xl font-bold text-purple-600">
                    €{currentYearData.bookings > 0 ? (currentYearData.amount / currentYearData.bookings).toFixed(0) : 0}
                  </h4>
                  <p className="text-sm text-gray-600">Average per Booking</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Relationships Tab */}
      {viewType === 'relationships' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Related Customers</h3>
          
          {customerData.relatedCustomers.length > 0 ? (
            <div className="space-y-4">
              {customerData.relatedCustomers.map(related => (
                <div key={related.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{related.name}</h4>
                      <p className="text-sm text-gray-500">{related.relationship}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">€{related.totalSpent.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total spent</p>
                  </div>
                  <button
                    onClick={() => onCustomerSelect?.(related.id)}
                    className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View
                  </button>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-800">Combined Network Value</h4>
                    <p className="text-sm text-green-600">Total spending by this customer and related customers</p>
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    €{(customerData.totalSpent + customerData.relatedCustomers.reduce((sum, r) => sum + r.totalSpent, 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No related customers found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}