import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, Euro, AlertTriangle, CheckCircle } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import toast from 'react-hot-toast';

interface DailySummary {
  id: string;
  managerId: string;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  summaryDate: string;
  totalCashDeposited: number;
  totalCashReceived: number;
  totalDiscrepancy: number;
  totalAcceptedLoss: number;
  waiterCount: number;
  status: 'PENDING' | 'FINALIZED' | 'REPORTED';
  finalizedAt?: string;
  notes?: string;
}

interface WaiterSummaryDetail {
  waiterId: string;
  waiterName: string;
  totalCashOrders: number;
  depositedAmount: number;
  receivedAmount: number;
  discrepancy: number;
  status: string;
}

interface DailyCashSummaryProps {
  onClose: () => void;
}

export default function DailyCashSummary({ onClose }: DailyCashSummaryProps) {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [waiterDetails, setWaiterDetails] = useState<WaiterSummaryDetail[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');
  const [isFinalizingDay, setIsFinalizingDay] = useState(false);

  useEffect(() => {
    fetchDailySummaries();
  }, [selectedDate]);

  const fetchDailySummaries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/admin/revenue/cash/daily-summary?date=${selectedDate}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Backend returns { summary: dailySummary, waiterSummaries }
        if (data.data.summary) {
          setSummaries([data.data.summary]);
          setWaiterDetails(data.data.waiterSummaries.map((ws: any) => ({
            waiterId: ws.waiterId,
            waiterName: ws.waiter.name,
            totalCashOrders: ws.totalCashOrders,
            depositedAmount: ws.deposits.reduce((sum: number, d: any) => sum + d.amount, 0),
            receivedAmount: ws.deposits.reduce((sum: number, d: any) => sum + (d.actualReceived || 0), 0),
            discrepancy: ws.deposits.reduce((sum: number, d: any) => sum + (d.difference || 0), 0),
            status: ws.status
          })));
        } else {
          setSummaries([]);
          setWaiterDetails([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch daily summaries:', error);
      toast.error('Failed to load daily summaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchWaiterDetails = async (summaryId: string) => {
    // Details are already loaded, just show them
    setShowDetails(true);
  };

  const finalizeDailySummary = async (summaryId: string) => {
    setIsFinalizingDay(true);
    try {
      const response = await fetch(`${baseUrl}/admin/revenue/cash/daily-summary/${summaryId}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          notes: managerNotes,
        }),
      });

      if (response.ok) {
        toast.success('Daily summary finalized successfully!');
        await fetchDailySummaries();
        setManagerNotes('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to finalize daily summary');
      }
    } catch (error) {
      console.error('Failed to finalize daily summary:', error);
      toast.error('Failed to finalize daily summary');
    } finally {
      setIsFinalizingDay(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FINALIZED':
        return 'bg-green-100 text-green-800';
      case 'REPORTED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const todaysSummary = summaries[0];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Daily Cash Summary Report</h2>
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
            <label htmlFor="summaryDate" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                id="summaryDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !todaysSummary ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Summary Available</h3>
              <p className="text-gray-500">No cash activity recorded for {new Date(selectedDate).toLocaleDateString()}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Total Cash Deposited</p>
                      <p className="text-2xl font-bold text-blue-800">€{todaysSummary.totalCashDeposited.toFixed(2)}</p>
                    </div>
                    <Euro className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Total Cash Received</p>
                      <p className="text-2xl font-bold text-green-800">€{todaysSummary.totalCashReceived.toFixed(2)}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Total Discrepancy</p>
                      <p className="text-2xl font-bold text-red-800">€{todaysSummary.totalDiscrepancy.toFixed(2)}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600">Waiters Processed</p>
                      <p className="text-2xl font-bold text-purple-800">{todaysSummary.waiterCount}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Summary Details */}
              <div className="bg-white border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Summary for {new Date(todaysSummary.summaryDate).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-gray-600">Manager: {todaysSummary.manager.name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(todaysSummary.status)}`}>
                    {todaysSummary.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Cash Collection Rate</p>
                    <p className="text-lg font-semibold">
                      {todaysSummary.totalCashDeposited > 0 
                        ? ((todaysSummary.totalCashReceived / todaysSummary.totalCashDeposited) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Accepted Losses</p>
                    <p className="text-lg font-semibold text-red-600">€{todaysSummary.totalAcceptedLoss.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Net Cash Flow</p>
                    <p className="text-lg font-semibold text-green-600">
                      €{(todaysSummary.totalCashReceived - todaysSummary.totalAcceptedLoss).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => fetchWaiterDetails(todaysSummary.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Waiter Details
                  </button>
                  
                  {todaysSummary.status === 'PENDING' && (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Add manager notes..."
                        value={managerNotes}
                        onChange={(e) => setManagerNotes(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <button
                        onClick={() => finalizeDailySummary(todaysSummary.id)}
                        disabled={isFinalizingDay}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isFinalizingDay ? 'Finalizing...' : 'Finalize Day'}
                      </button>
                    </div>
                  )}
                </div>

                {todaysSummary.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Manager Notes:</p>
                    <p className="text-gray-800">{todaysSummary.notes}</p>
                  </div>
                )}

                {todaysSummary.finalizedAt && (
                  <p className="text-xs text-gray-500 mt-4">
                    Finalized: {new Date(todaysSummary.finalizedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Waiter Details Modal */}
          {showDetails && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Waiter Details</h3>
                    <button 
                      onClick={() => setShowDetails(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {waiterDetails.map((waiter) => (
                      <div key={waiter.waiterId} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-gray-800">{waiter.waiterName}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(waiter.status)}`}>
                            {waiter.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Cash Orders</p>
                            <p className="font-semibold">€{waiter.totalCashOrders.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Deposited</p>
                            <p className="font-semibold">€{waiter.depositedAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Received</p>
                            <p className="font-semibold">€{waiter.receivedAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Discrepancy</p>
                            <p className={`font-semibold ${waiter.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                              €{waiter.discrepancy.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}