import { useState, useEffect } from 'react';
import { Calendar, CreditCard, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

interface PaymentHistoryData {
  waiterId: string;
  waiterName: string;
  paymentMethods: {
    [key: string]: {
      totalAmount: number;
      orderCount: number;
      orders: OrderDetail[];
    };
  };
}

interface OrderDetail {
  id: string;
  total: number;
  createdAt: string;
  locationName: string;
  customerName?: string;
  charge?: {
    id: string;
    amount: number;
    paymentMethod: string;
    status: string;
  };
}

interface WaiterPaymentHistoryProps {
  onClose: () => void;
}

export default function WaiterPaymentHistory({ onClose }: WaiterPaymentHistoryProps) {
  const [paymentData, setPaymentData] = useState<PaymentHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'card' | 'bank'>('all');
  const { user } = useAuth();
   
  console.log(user);
  useEffect(() => {
    if (user?.id) {
      fetchPaymentHistory();
    }
  }, [selectedDate, user?.id]);

  const fetchPaymentHistory = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch payment history for current user
      const response = await fetch(`${baseUrl}/admin/revenue/payments/history?date=${selectedDate}&waiterId=${user.id}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Find current user's data from the response
        const userPaymentData = data.data.find((waiter: any) => waiter.waiterId === user.id);
        setPaymentData(userPaymentData || null);
      } else {
        toast.error('Failed to load payment history');
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodDisplay = (method: string) => {
    switch (method) {
      case 'cash':
        return { name: 'Cash', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
      case 'stripe':
        return { name: 'Card', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
      case 'bank_transfer':
        return { name: 'Bank Transfer', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' };
      default:
        return { name: method, icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' };
    }
  };

  const filterOrdersByPaymentMethod = (orders: OrderDetail[], method: string) => {
    if (method === 'all') return orders;
    return orders.filter(order => {
      switch (method) {
        case 'cash':
          return order.charge?.paymentMethod === 'cash';
        case 'card':
          return order.charge?.paymentMethod === 'stripe';
        case 'bank':
          return order.charge?.paymentMethod === 'bank_transfer';
        default:
          return true;
      }
    });
  };

  const getFilteredData = () => {
    if (!paymentData) return { totalAmount: 0, totalOrders: 0, orders: [] };
    
    const allOrders = Object.values(paymentData.paymentMethods).flatMap(method => method.orders);
    const filteredOrders = filterOrdersByPaymentMethod(allOrders, activeTab);
    
    const totalAmount = filteredOrders.reduce((sum, order) => sum + (order.charge?.amount || 0), 0);
    const totalOrders = filteredOrders.length;
    
    return { totalAmount, totalOrders, orders: filteredOrders };
  };

  const getTotalsByMethod = () => {
    if (!paymentData) return {};
    
    const totals: { [key: string]: { amount: number; count: number } } = {};
    
    Object.entries(paymentData.paymentMethods).forEach(([method, data]) => {
      totals[method] = {
        amount: data.totalAmount,
        count: data.orderCount
      };
    });
    
    return totals;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();
  const totalsByMethod = getTotalsByMethod();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Payment History</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Date Selector */}
          <div className="mb-6">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="relative max-w-xs">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {!paymentData ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
              <p className="text-gray-500">No payment records found for the selected date.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(totalsByMethod).map(([method, data]) => {
                  const display = getPaymentMethodDisplay(method);
                  const IconComponent = display.icon;
                  return (
                    <div key={method} className={`border rounded-lg p-4 ${display.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent className={`w-5 h-5 ${display.color}`} />
                        <span className="text-sm font-medium text-gray-600">{display.name}</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">€{data.amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">{data.count} orders</div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Method Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'all', label: 'All', count: filteredData.totalOrders },
                    { key: 'cash', label: 'Cash', count: totalsByMethod.cash?.count || 0 },
                    { key: 'card', label: 'Card', count: totalsByMethod.stripe?.count || 0 },
                    { key: 'bank', label: 'Bank', count: totalsByMethod.bank_transfer?.count || 0 },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </nav>
              </div>

              {/* Summary for Active Tab */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">€{filteredData.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-green-600">{filteredData.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Order</p>
                    <p className="text-2xl font-bold text-purple-600">
                      €{filteredData.totalOrders > 0 ? (filteredData.totalAmount / filteredData.totalOrders).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-800">Order Details</h4>
                {filteredData.orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No orders found for the selected filter.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredData.orders
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((order) => {
                        const paymentDisplay = getPaymentMethodDisplay(order.charge?.paymentMethod || 'UNKNOWN');
                        const PaymentIcon = paymentDisplay.icon;
                        
                        return (
                          <div key={order.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium">Order #{order.id.slice(-6)}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentDisplay.bg} ${paymentDisplay.color}`}>
                                    <PaymentIcon className="w-3 h-3 inline mr-1" />
                                    {paymentDisplay.name}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    order.charge?.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {order.charge?.status || 'PENDING'}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Location: {order.locationName} • Customer: {order.customerName || 'Guest'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(order.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  €{(order.charge?.amount || order.total).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}