import { useState, useEffect } from "react";
import { 
  RiCalendarCheckLine, 
  RiMoneyEuroCircleLine,
  RiUserReceived2Line,
  RiCheckLine,
  RiErrorWarningLine,
  RiEyeLine
} from "react-icons/ri";
import DailyCashSummary from "../user/DailyCashSummary";
import { baseUrl } from "../../../utils/constants";

export default function DailySummaries() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<any>(null);

  useEffect(() => {
    fetchSummaries();
  }, [selectedDate]);

  const fetchSummaries = async () => {
    try {
      const response = await fetch(`${baseUrl}/admin/revenue/cash/daily-summary?date=${selectedDate}`, {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Transform the API response to match our component structure
          const summary = data.data.summary;
          const waiterSummaries = data.data.waiterSummaries || [];
          
          if (summary) {
            const transformedSummary = {
              id: summary.id,
              date: selectedDate,
              status: summary.status,
              totalCash: summary.totalCashDeposited,
              totalDeposits: summary.totalCashReceived,
              discrepancy: summary.totalDiscrepancy,
              waiterCount: summary.waiterCount,
              waiters: waiterSummaries.map((ws: any) => ({
                name: ws.waiter?.name || 'Unknown',
                deposited: ws.deposits?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0,
                expected: ws.totalCashOrders || 0,
                discrepancy: (ws.deposits?.reduce((sum: number, d: any) => sum + (d.difference || 0), 0)) || 0
              }))
            };
            setSummaries([transformedSummary]);
          } else {
            setSummaries([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching daily summaries:", error);
      setSummaries([]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <RiErrorWarningLine className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case "FINALIZED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <RiCheckLine className="w-3 h-3 mr-1" />
            Finalized
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  const handleViewDetails = (summary: any) => {
    setSelectedSummary(summary);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Daily Cash Summaries</h2>
          <p className="text-sm text-gray-500">View and manage daily cash summary reports</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <RiCalendarCheckLine className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <RiCalendarCheckLine className="w-4 h-4 mr-2" />
            View Summary
          </button>
        </div>
      </div>

      {/* Summary Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <RiMoneyEuroCircleLine className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Cash</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{summaries.find(s => s.date === selectedDate)?.totalCash?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RiCalendarCheckLine className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Deposits</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{summaries.find(s => s.date === selectedDate)?.totalDeposits?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <RiErrorWarningLine className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Discrepancy</p>
              <p className={`text-2xl font-semibold ${
                (summaries.find(s => s.date === selectedDate)?.discrepancy || 0) === 0 
                  ? "text-green-600" 
                  : "text-red-600"
              }`}>
                €{summaries.find(s => s.date === selectedDate)?.discrepancy?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <RiUserReceived2Line className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Waiters</p>
              <p className="text-2xl font-semibold text-gray-900">
                {summaries.find(s => s.date === selectedDate)?.waiterCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summaries Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Summary History</h3>
        </div>
        
        <div className="overflow-x-auto">
          {summaries.length === 0 ? (
            <div className="text-center py-12">
              <RiCalendarCheckLine className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No summaries found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No daily summaries found for the selected period.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cash
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deposits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discrepancy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waiters
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaries.map((summary) => (
                  <tr key={summary.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(summary.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(summary.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{summary.totalCash.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{summary.totalDeposits.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        summary.discrepancy === 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        €{summary.discrepancy.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {summary.waiterCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(summary)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Details"
                      >
                        <RiEyeLine size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Daily Summary - {new Date(selectedSummary.date).toLocaleDateString()}
              </h3>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Total Cash</p>
                  <p className="text-xl font-semibold text-gray-900">€{selectedSummary.totalCash.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Total Deposits</p>
                  <p className="text-xl font-semibold text-gray-900">€{selectedSummary.totalDeposits.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Discrepancy</p>
                  <p className={`text-xl font-semibold ${
                    selectedSummary.discrepancy === 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    €{selectedSummary.discrepancy.toFixed(2)}
                  </p>
                </div>
              </div>

              <h4 className="text-lg font-medium text-gray-900 mb-4">Waiter Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waiter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expected
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deposited
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Discrepancy
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedSummary.waiters.map((waiter: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {waiter.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          €{waiter.expected.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          €{waiter.deposited.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${
                            waiter.discrepancy === 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            €{waiter.discrepancy.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-3 flex justify-end rounded-b-lg">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Daily Cash Summary Modal */}
      {/* Note: This can be integrated with the existing DailyCashSummary component */}
    </div>
  );
}