import { useState, useEffect } from 'react';
import { Calendar, Users, DollarSign, CreditCard, TrendingUp, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import toast from 'react-hot-toast';

interface WaiterPaymentSummary {
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

interface ManagerPaymentSummaryProps {
  onClose: () => void;
}

export default function ManagerPaymentSummary({ onClose }: ManagerPaymentSummaryProps) {
  const [waiterSummaries, setWaiterSummaries] = useState<WaiterPaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'card' | 'bank'>('all');
  const [expandedWaiters, setExpandedWaiters] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPaymentSummaries();
  }, [selectedDate]);

  const fetchPaymentSummaries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/revenue/payments/history?date=${selectedDate}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setWaiterSummaries(data.data || []);
      } else {
        toast.error('Failed to load payment summaries');
      }
    } catch (error) {
      console.error('Failed to fetch payment summaries:', error);
      toast.error('Failed to load payment summaries');
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

  const filterWaitersByPaymentMethod = (waiters: WaiterPaymentSummary[], method: string) => {
    if (method === 'all') return waiters;
    
    return waiters.map(waiter => ({
      ...waiter,
      paymentMethods: Object.fromEntries(
        Object.entries(waiter.paymentMethods).filter(([paymentMethod]) => {
          switch (method) {
            case 'cash':
              return paymentMethod === 'cash';
            case 'card':
              return paymentMethod === 'stripe';
            case 'bank':
              return paymentMethod === 'bank_transfer';
            default:
              return true;
          }
        })
      )
    })).filter(waiter => Object.keys(waiter.paymentMethods).length > 0);
  };

  const getOverallTotals = () => {
    const totals = { totalAmount: 0, totalOrders: 0, byMethod: {} as any };
    
    waiterSummaries.forEach(waiter => {
      Object.entries(waiter.paymentMethods).forEach(([method, data]) => {
        totals.totalAmount += data.totalAmount;
        totals.totalOrders += data.orderCount;
        
        if (!totals.byMethod[method]) {
          totals.byMethod[method] = { amount: 0, count: 0 };
        }
        totals.byMethod[method].amount += data.totalAmount;
        totals.byMethod[method].count += data.orderCount;
      });
    });
    
    return totals;
  };

  const toggleWaiterExpansion = (waiterId: string) => {
    const newExpanded = new Set(expandedWaiters);
    if (newExpanded.has(waiterId)) {
      newExpanded.delete(waiterId);
    } else {
      newExpanded.add(waiterId);
    }
    setExpandedWaiters(newExpanded);
  };

  const handleRequestCash = async (waiterId: string, amount: number) => {
    if (!window.confirm(`Request €${amount.toFixed(2)} cash from this waiter?`)) {
      return;
    }

    try {
      // This would trigger cash summary creation for the waiter
      const response = await fetch(`${baseUrl}/admin/revenue/cash/waiter/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          waiterId,
          summaryDate: selectedDate,
          totalCashOrders: amount,
          outstandingBalance: amount,
        }),
      });

      if (response.ok) {
        toast.success('Cash summary created and waiter has been notified');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create cash summary');
      }
    } catch (error) {
      console.error('Failed to request cash:', error);
      toast.error('Failed to request cash from waiter');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const filteredWaiters = filterWaitersByPaymentMethod(waiterSummaries, activeTab);
  const overallTotals = getOverallTotals();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Manager Payment Summary</h2>
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

          {/* Overall Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">€{overallTotals.totalAmount.toFixed(2)}</div>
              <div className="text-sm text-gray-600">{overallTotals.totalOrders} orders</div>
            </div>

            {Object.entries(overallTotals.byMethod).map(([method, data]: [string, any]) => {
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
                { key: 'all', label: 'All Payments', count: overallTotals.totalOrders },
                { key: 'cash', label: 'Cash', count: overallTotals.byMethod.cash?.count || 0 },
                { key: 'card', label: 'Card', count: overallTotals.byMethod.stripe?.count || 0 },
                { key: 'bank', label: 'Bank', count: overallTotals.byMethod.bank_transfer?.count || 0 },
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

          {/* Waiters Summary */}
          {filteredWaiters.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Data</h3>
              <p className="text-gray-500">No payment records found for the selected date and filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWaiters.map((waiter) => {
                const waiterTotal = Object.values(waiter.paymentMethods).reduce((sum, method) => sum + method.totalAmount, 0);
                const waiterOrderCount = Object.values(waiter.paymentMethods).reduce((sum, method) => sum + method.orderCount, 0);
                const cashAmount = waiter.paymentMethods.cash?.totalAmount || 0;
                
                return (
                  <div key={waiter.waiterId} className="bg-white border rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleWaiterExpansion(waiter.waiterId)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedWaiters.has(waiter.waiterId) ? (
                            <ChevronUp className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{waiter.waiterName}</h3>
                          <p className="text-sm text-gray-600">
                            {waiterOrderCount} orders • €{waiterTotal.toFixed(2)} total
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* Payment Method Summary */}
                        {Object.entries(waiter.paymentMethods).map(([method, data]) => {
                          const display = getPaymentMethodDisplay(method);
                          const IconComponent = display.icon;
                          return (
                            <div key={method} className={`px-3 py-1 rounded-lg border ${display.bg}`}>
                              <div className="flex items-center space-x-1">
                                <IconComponent className={`w-4 h-4 ${display.color}`} />
                                <span className="text-sm font-medium">€{data.totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Request Cash Button */}
                        {cashAmount > 0 && (
                          <button
                            onClick={() => handleRequestCash(waiter.waiterId, cashAmount)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span>Request €{cashAmount.toFixed(2)}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Order Details */}
                    {expandedWaiters.has(waiter.waiterId) && (
                      <div className="border-t pt-4 mt-4">
                        {Object.entries(waiter.paymentMethods).map(([method, methodData]) => {
                          const display = getPaymentMethodDisplay(method);
                          const IconComponent = display.icon;
                          
                          return (
                            <div key={method} className="mb-4">
                              <div className={`flex items-center space-x-2 mb-2 p-2 rounded-lg ${display.bg}`}>
                                <IconComponent className={`w-4 h-4 ${display.color}`} />
                                <span className="font-medium">{display.name} Orders</span>
                                <span className="text-sm text-gray-600">
                                  ({methodData.orderCount} orders • €{methodData.totalAmount.toFixed(2)})
                                </span>
                              </div>
                              
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {methodData.orders
                                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                  .map((order) => (
                                    <div key={order.id} className="bg-gray-50 rounded p-3 text-sm">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <span className="font-medium">Order #{order.id.slice(-6)}</span>
                                          <span className="text-gray-600 ml-2">
                                            {order.locationName} • {order.customerName || 'Guest'}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium">€{(order.charge?.amount || order.total).toFixed(2)}</div>
                                          <div className="text-xs text-gray-500">
                                            {new Date(order.createdAt).toLocaleTimeString()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}