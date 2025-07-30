import { useState, useEffect } from 'react';
import { Euro, Clock, CheckCircle, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

interface CashSummary {
  id: string;
  summaryDate: string;
  periodStart: string;
  periodEnd: string;
  totalCashOrders: number;
  outstandingBalance: number;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'DISCREPANCY' | 'COMPLETED';
  submittedAt?: string;
  verifiedAt?: string;
  deposits: CashDeposit[];
}

interface CashDeposit {
  id: string;
  amount: number;
  actualReceived?: number;
  difference?: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'DISCREPANCY' | 'LOSS_ACCEPTED' | 'COMPLETED';
  depositedAt: string;
  processedAt?: string;
  notes?: string;
}

interface WaiterCashSummaryProps {
  onClose: () => void;
}

export default function WaiterCashSummary({ onClose }: WaiterCashSummaryProps) {
  const [currentSummary, setCurrentSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchCurrentSummary();
    }
  }, [user?.id, selectedDate]);

  const fetchCurrentSummary = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`${baseUrl}/admin/revenue/cash/waiter/${user.id}/summary?date=${selectedDate}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentSummary(data.data);
        if (data.data && data.data.outstandingBalance > 0) {
          setDepositAmount(data.data.outstandingBalance.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch cash summary:', error);
      toast.error('Failed to load cash summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!currentSummary || !depositAmount) {
      toast.error('Please enter a deposit amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${baseUrl}/admin/revenue/cash/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cashSummaryId: currentSummary.id,
          amount: parseFloat(depositAmount),
        }),
      });

      if (response.ok) {
        toast.success('Cash deposit submitted successfully!');
        await fetchCurrentSummary();
        setShowDepositModal(false);
        setDepositAmount('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to submit deposit');
      }
    } catch (error) {
      console.error('Failed to submit deposit:', error);
      toast.error('Failed to submit deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'SUBMITTED':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'VERIFIED':
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'DISCREPANCY':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'VERIFIED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'DISCREPANCY':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Cash Summary</h2>
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
            <div className="relative max-w-xs">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="summaryDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {!currentSummary ? (
            <div className="text-center py-12">
              <Euro className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Cash Summary Available</h3>
              <p className="text-gray-500">No cash orders found for {new Date(selectedDate).toLocaleDateString()}.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Header */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Current Period Summary</h3>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(currentSummary.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentSummary.status)}`}>
                      {currentSummary.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="text-lg font-semibold">
                      {new Date(currentSummary.periodStart).toLocaleDateString()} - {new Date(currentSummary.periodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Total Cash Orders</p>
                    <p className="text-2xl font-bold text-blue-600">€{currentSummary.totalCashOrders.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-red-600">€{currentSummary.outstandingBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Deposits Section */}
              {currentSummary.deposits.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Deposit History</h4>
                  <div className="space-y-3">
                    {currentSummary.deposits.map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">€{deposit.amount.toFixed(2)} deposited</p>
                          <p className="text-sm text-gray-600">
                            {new Date(deposit.depositedAt).toLocaleString()}
                          </p>
                          {deposit.notes && (
                            <p className="text-sm text-gray-500 mt-1">Note: {deposit.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deposit.status)}`}>
                            {deposit.status}
                          </span>
                          {deposit.difference !== undefined && deposit.difference !== 0 && (
                            <span className="text-sm text-red-600">
                              (Diff: €{deposit?.difference?.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {currentSummary.outstandingBalance > 0 && currentSummary.status === 'PENDING' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Euro className="w-5 h-5" />
                    <span>Deposit Cash to Manager</span>
                  </button>
                </div>
              )}

              {currentSummary.status === 'SUBMITTED' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <p className="text-blue-800 font-medium">Waiting for Manager Verification</p>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    Your cash deposit has been submitted and is waiting for manager verification.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Deposit Modal */}
          {showDepositModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Submit Cash Deposit</h3>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Outstanding Balance:</p>
                    <p className="text-2xl font-bold text-red-600">€{currentSummary?.outstandingBalance.toFixed(2)}</p>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 mb-2">
                      Deposit Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                      <input
                        id="depositAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the exact amount you are depositing to the manager
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDepositModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitDeposit}
                      disabled={isSubmitting || !depositAmount || parseFloat(depositAmount) <= 0}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Deposit'}
                    </button>
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