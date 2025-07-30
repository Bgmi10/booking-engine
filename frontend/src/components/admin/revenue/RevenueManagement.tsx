import { useState } from "react";
import { 
  RiMoneyEuroCircleLine, 
  RiFileListLine, 
  RiCalendarCheckLine,
  RiBarChartLine,
  RiSettingsLine
} from "react-icons/ri";
import CashManagement from "./CashManagement";
import PaymentHistory from "./PaymentHistory";
import DailySummaries from "./DailySummaries";
import RevenueAnalytics from "./RevenueAnalytics";
import RevenueSettings from "./RevenueSettings";

export default function RevenueManagement() {
  const [activeTab, setActiveTab] = useState("cash-management");

  const tabs = [
    {
      id: "cash-management",
      name: "Cash Management",
      icon: <RiMoneyEuroCircleLine className="w-5 h-5" />,
      component: <CashManagement />
    },
    {
      id: "payment-history",
      name: "Payment History",
      icon: <RiFileListLine className="w-5 h-5" />,
      component: <PaymentHistory />
    },
    {
      id: "daily-summaries",
      name: "Daily Summaries",
      icon: <RiCalendarCheckLine className="w-5 h-5" />,
      component: <DailySummaries />
    },
    {
      id: "analytics",
      name: "Revenue Analytics",
      icon: <RiBarChartLine className="w-5 h-5" />,
      component: <RevenueAnalytics />
    },
    {
      id: "settings",
      name: "Settings",
      icon: <RiSettingsLine className="w-5 h-5" />,
      component: <RevenueSettings />
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Revenue Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Comprehensive financial management and reporting dashboard
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </div>
    </div>
  );
}