import { useState, useEffect } from 'react';
import { Euro, CheckCircle, AlertTriangle, Clock, TrendingUp, Users } from 'lucide-react';
import { baseUrl } from '../../../utils/constants';
import toast from 'react-hot-toast';

interface WaiterCashSummary {
  id: string;
  waiterId: string;
  waiter: {
    id: string;
    name: string;
    email: string;
  };
  summaryDate: string;
  periodStart: string;
  periodEnd: string;
  totalCashOrders: number;
  outstandingBalance: number;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'DISCREPANCY' | 'COMPLETED';
  submittedAt?: string;
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

interface ManagerCashVerificationProps {
  onClose: () => void;
}

export default function ManagerCashVerification({ onClose }: ManagerCashVerificationProps) {
  const [summaries, setSummaries] = useState<WaiterCashSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<WaiterCashSummary | null>(null);
  const [verificationModal, setVerificationModal] = useState(false);
  const [actualReceived, setActualReceived] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPendingSummaries();
  }, []);

  const fetchPendingSummaries = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/revenue/cash/deposits/pending`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSummaries(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pending summaries:', error);
      toast.error('Failed to load pending cash summaries');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDeposit = async (action: 'accept' | 'discrepancy' | 'accept_loss') => {
    if (!selectedSummary || !selectedSummary.deposits[0]) return;

    setIsProcessing(true);
    try {
      const deposit = selectedSummary.deposits[0];
      const actualAmount = parseFloat(actualReceived) || deposit.amount;
      
      const response = await fetch(`${baseUrl}/admin/revenue/cash/deposit/${deposit.id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          actualReceived: actualAmount,
          notes: managerNotes,
          action: action,
        }),
      });

      if (response.ok) {
        toast.success('Deposit verification completed!');
        await fetchPendingSummaries();
        setVerificationModal(false);
        setSelectedSummary(null);
        setActualReceived('');
        setManagerNotes('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to verify deposit');
      }
    } catch (error) {
      console.error('Failed to verify deposit:', error);
      toast.error('Failed to verify deposit');
    } finally {
      setIsProcessing(false);
    }
  };

  const openVerificationModal = (summary: WaiterCashSummary) => {
    setSelectedSummary(summary);
    setActualReceived(summary.deposits[0]?.amount.toString() || '');
    setVerificationModal(true);
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
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Cash Verification - Manager View</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {summaries.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Verifications</h3>
              <p className="text-gray-500">All waiter cash deposits have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">Manager Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Review each waiter's cash deposit amount</li>
                  <li>Count the actual cash received from the waiter</li>
                  <li>Enter the exact amount you received</li>
                  <li>If there's a discrepancy, you can accept the loss or log it for tracking</li>
                </ol>
              </div>

              {summaries.map((summary) => (
                <div key={summary.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{summary.waiter.name}</h3>
                      <p className="text-sm text-gray-600">{summary.waiter.email}</p>
                      <p className="text-sm text-gray-500">
                        Period: {new Date(summary.periodStart).toLocaleDateString()} - {new Date(summary.periodEnd).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(summary.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(summary.status)}`}>
                        {summary.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Total Cash Orders</p>
                      <p className="text-lg font-semibold text-blue-600">€{summary.totalCashOrders.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Outstanding Balance</p>
                      <p className="text-lg font-semibold text-red-600">€{summary.outstandingBalance.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Deposited Amount</p>
                      <p className="text-lg font-semibold text-green-600">
                        €{summary.deposits[0]?.amount.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  {summary.deposits.length > 0 && summary.status === 'SUBMITTED' && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => openVerificationModal(summary)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Verify Deposit</span>
                      </button>
                    </div>
                  )}

                  {summary.submittedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(summary.submittedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Verification Modal */}
          {verificationModal && selectedSummary && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Verify Cash Deposit - {selectedSummary.waiter.name}
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-600">Waiter Deposited</p>
                        <p className="text-xl font-bold text-blue-800">
                          €{selectedSummary.deposits[0]?.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-600">Outstanding Balance</p>
                        <p className="text-xl font-bold text-green-800">
                          €{selectedSummary.outstandingBalance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="actualReceived" className="block text-sm font-medium text-gray-700 mb-2">
                        Actual Amount Received
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                        <input
                          id="actualReceived"
                          type="number"
                          step="0.01"
                          min="0"
                          value={actualReceived}
                          onChange={(e) => setActualReceived(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="managerNotes" className="block text-sm font-medium text-gray-700 mb-2">
                        Manager Notes (Optional)
                      </label>
                      <textarea
                        id="managerNotes"
                        value={managerNotes}
                        onChange={(e) => setManagerNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Add any notes about this deposit verification..."
                      />
                    </div>

                    {parseFloat(actualReceived) !== (selectedSummary.deposits[0]?.amount || 0) && actualReceived && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Discrepancy Detected:</strong> {' '}
                          €{Math.abs(parseFloat(actualReceived) - (selectedSummary.deposits[0]?.amount || 0)).toFixed(2)} difference
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setVerificationModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                    
                    {parseFloat(actualReceived) === (selectedSummary.deposits[0]?.amount || 0) || !actualReceived ? (
                      <button
                        onClick={() => handleVerifyDeposit('accept')}
                        disabled={isProcessing || !actualReceived}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? 'Processing...' : 'Accept Deposit'}
                      </button>
                    ) : (
                      <div className="flex-1 space-y-2">
                        <button
                          onClick={() => handleVerifyDeposit('discrepancy')}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Log Discrepancy'}
                        </button>
                        <button
                          onClick={() => handleVerifyDeposit('accept_loss')}
                          disabled={isProcessing}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Accept Loss'}
                        </button>
                      </div>
                    )}
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