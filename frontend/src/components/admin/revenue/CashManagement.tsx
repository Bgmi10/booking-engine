import { useState, useEffect } from "react";
import { 
  RiMoneyEuroCircleLine, 
  RiUserReceived2Line,
  RiCalendarCheckLine,
  RiSettings4Line
} from "react-icons/ri";
import ManagerCashVerification from "../user/ManagerCashVerification";
import DailyCashSummary from "../user/DailyCashSummary";
import { useAuth } from "../../../context/AuthContext";
import { baseUrl } from "../../../utils/constants";

export default function CashManagement() {
  const [showCashVerification, setShowCashVerification] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    pendingDeposits: 0,
    todaysCash: 0,
    activeWaiters: 0,
    discrepancies: 0
  });
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch pending deposits
      const pendingResponse = await fetch(`${baseUrl}/admin/revenue/cash/deposits/pending`, {
        credentials: "include"
      });
      
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        const pendingCount = pendingData.data?.length || 0;
        
        // Fetch daily summary for today's cash
        const today = new Date().toISOString().split('T')[0];
        const summaryResponse = await fetch(`${baseUrl}/admin/revenue/cash/daily-summary?date=${today}`, {
          credentials: "include"
        });
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const todaysCash = summaryData.data?.summary?.totalCashReceived || 0;
          const waiterCount = summaryData.data?.summary?.waiterCount || 0;
          const discrepancies = summaryData.data?.summary?.totalDiscrepancy || 0;
          
          setDashboardStats({
            pendingDeposits: pendingCount,
            todaysCash: todaysCash,
            activeWaiters: waiterCount,
            discrepancies: Math.abs(discrepancies)
          });
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const cashManagementCards = [
    {
      title: "Cash Verification",
      description: "Verify and manage waiter cash deposits",
      icon: <RiMoneyEuroCircleLine className="w-8 h-8 text-green-600" />,
      action: () => setShowCashVerification(true),
      buttonText: "Open Verification",
      buttonColor: "bg-green-600 hover:bg-green-700"
    },
    {
      title: "Daily Cash Summary",
      description: "View and finalize daily cash summaries",
      icon: <RiCalendarCheckLine className="w-8 h-8 text-blue-600" />,
      action: () => setShowDailySummary(true),
      buttonText: "View Summary",
      buttonColor: "bg-blue-600 hover:bg-blue-700"
    },
    {
      title: "Waiter Management",
      description: "Manage waiter cash accounts and history",
      icon: <RiUserReceived2Line className="w-8 h-8 text-purple-600" />,
      action: () => {}, // TODO: Implement waiter management
      buttonText: "Manage Waiters",
      buttonColor: "bg-purple-600 hover:bg-purple-700"
    },
    {
      title: "Cash Settings",
      description: "Configure cash management settings",
      icon: <RiSettings4Line className="w-8 h-8 text-gray-600" />,
      action: () => setShowSettings(true),
      buttonText: "Open Settings",
      buttonColor: "bg-gray-600 hover:bg-gray-700"
    }
  ];

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <RiMoneyEuroCircleLine className="w-12 h-12" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Restricted</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access cash management features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <RiMoneyEuroCircleLine className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Deposits</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardStats.pendingDeposits}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RiCalendarCheckLine className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Today's Cash</p>
              <p className="text-2xl font-semibold text-gray-900">€{dashboardStats.todaysCash.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <RiUserReceived2Line className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Waiters</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardStats.activeWaiters}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <RiSettings4Line className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Discrepancies</p>
              <p className="text-2xl font-semibold text-gray-900">€{dashboardStats.discrepancies.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cashManagementCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {card.description}
                </p>
                <button
                  onClick={card.action}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${card.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {card.buttonText}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Cash Activity</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <RiMoneyEuroCircleLine className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
            <p className="mt-1 text-sm text-gray-500">
              Cash activities will appear here when available.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCashVerification && (
        <ManagerCashVerification onClose={() => setShowCashVerification(false)} />
      )}
      {showDailySummary && (
        <DailyCashSummary onClose={() => setShowDailySummary(false)} />
      )}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-xl font-semibold text-gray-900">Cash Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-500">Cash management settings will be implemented here.</p>
            </div>
            <div className="bg-gray-50 px-4 py-3 flex justify-end rounded-b-lg">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}