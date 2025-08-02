import { useState, useEffect } from "react";
import { 
  RiBarChartLine,
  RiPieChartLine,
  RiLineChartLine,
  RiCalendarLine,
  RiTrelloFill,
  RiTShirt2Fill,
} from "react-icons/ri";
import { baseUrl } from "../../../utils/constants";

export default function RevenueAnalytics() {
  const [dateRange, setDateRange] = useState("week");
  const [chartType, setChartType] = useState("overview");
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const chartTypes = [
    { id: "overview", name: "Revenue Overview", icon: <RiBarChartLine className="w-5 h-5" /> },
    { id: "payment-methods", name: "Payment Methods", icon: <RiPieChartLine className="w-5 h-5" /> },
    { id: "trends", name: "Trends", icon: <RiLineChartLine className="w-5 h-5" /> }
  ];

  const dateRanges = [
    { id: "today", name: "Today" },
    { id: "week", name: "This Week" },
    { id: "month", name: "This Month" },
    { id: "quarter", name: "This Quarter" },
    { id: "custom", name: "Custom Range" }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({ dateRange });
      const response = await fetch(`${baseUrl}/admin/revenue/analytics?${params}`, {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const apiData = data.data;
          
          // Transform API data to match component structure
          const totalRevenue = apiData.summary?.totalRevenue || 0;
          const totalOrders = apiData.summary?.totalOrders || 0;
          const averageOrder = apiData.summary?.averageOrder || 0;
          
          // Calculate payment method percentages
          const paymentMethods = apiData.paymentMethods || {};
          const totalPaymentAmount = Object.values(paymentMethods).reduce((sum: number, method: any) => sum + (method.amount || 0), 0);
          
          const paymentMethodPercentages = {
            cash: totalPaymentAmount > 0 ? ((paymentMethods.CASH?.amount || 0) / totalPaymentAmount * 100) : 0,
            card: totalPaymentAmount > 0 ? ((paymentMethods.STRIPE?.amount || 0) / totalPaymentAmount * 100) : 0,
            bank: totalPaymentAmount > 0 ? ((paymentMethods.BANK_TRANSFER?.amount || 0) / totalPaymentAmount * 100) : 0
          };

          // Transform daily breakdown
          const dailyRevenue = Object.entries(apiData.dailyBreakdown || {}).map(([date, data]: [string, any]) => ({
            date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
            amount: data.amount || 0
          }));

          setAnalyticsData({
            totalRevenue,
            revenueChange: 0, // Would need historical data to calculate
            totalOrders,
            ordersChange: 0, // Would need historical data to calculate
            averageOrder,
            averageOrderChange: 0, // Would need historical data to calculate
            paymentMethods: paymentMethodPercentages,
            dailyRevenue
          });
        }
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Set default data on error
      setAnalyticsData({
        totalRevenue: 0,
        revenueChange: 0,
        totalOrders: 0,
        ordersChange: 0,
        averageOrder: 0,
        averageOrderChange: 0,
        paymentMethods: { cash: 0, card: 0, bank: 0 },
        dailyRevenue: []
      });
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <RiTrelloFill className="w-5 h-5 text-green-600" />;
    } else if (change < 0) {
      return <RiTShirt2Fill className="w-5 h-5 text-red-600" />;
    }
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Revenue Analytics</h2>
          <p className="text-sm text-gray-500">Comprehensive revenue analysis and insights</p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dateRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.name}
              </option>
            ))}
          </select>
          
          {dateRange === "custom" && (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{analyticsData?.totalRevenue.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <RiBarChartLine className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {getChangeIcon(analyticsData?.revenueChange || 0)}
            <span className={`ml-1 text-sm font-medium ${getChangeColor(analyticsData?.revenueChange || 0)}`}>
              {Math.abs(analyticsData?.revenueChange || 0)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analyticsData?.totalOrders.toLocaleString() || "0"}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <RiCalendarLine className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {getChangeIcon(analyticsData?.ordersChange || 0)}
            <span className={`ml-1 text-sm font-medium ${getChangeColor(analyticsData?.ordersChange || 0)}`}>
              {Math.abs(analyticsData?.ordersChange || 0)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last period</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Order</p>
              <p className="text-2xl font-semibold text-gray-900">
                €{analyticsData?.averageOrder.toFixed(2) || "0.00"}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <RiPieChartLine className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {getChangeIcon(analyticsData?.averageOrderChange || 0)}
            <span className={`ml-1 text-sm font-medium ${getChangeColor(analyticsData?.averageOrderChange || 0)}`}>
              {Math.abs(analyticsData?.averageOrderChange || 0)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">from last period</span>
          </div>
        </div>
      </div>

      {/* Chart Type Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {chartTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  chartType === type.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {type.icon}
                <span>{type.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {chartType === "overview" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Daily Revenue Overview</h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <RiBarChartLine className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Chart visualization will be implemented here</p>
                  <p className="text-xs text-gray-400">Integration with Chart.js or similar library needed</p>
                </div>
              </div>
              
              {/* Daily Revenue Table */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Daily Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Day
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % of Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(analyticsData?.dailyRevenue || []).map((day: any) => (
                        <tr key={day.date} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {day.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            €{day.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {analyticsData?.totalRevenue > 0 ? ((day.amount / analyticsData.totalRevenue) * 100).toFixed(1) : "0"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {chartType === "payment-methods" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Payment Methods Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <RiPieChartLine className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Pie chart will be displayed here</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">Cash</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {analyticsData?.paymentMethods.cash.toFixed(1) || "0"}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">Card/Stripe</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {analyticsData?.paymentMethods.card.toFixed(1) || "0"}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">Bank Transfer</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {analyticsData?.paymentMethods.bank.toFixed(1) || "0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {chartType === "trends" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Revenue Trends</h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <RiLineChartLine className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Trend analysis chart will be displayed here</p>
                  <p className="text-xs text-gray-400">Shows revenue patterns over time</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Peak Hour</p>
                  <p className="text-lg font-semibold text-gray-900">7:00 PM - 8:00 PM</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Best Day</p>
                  <p className="text-lg font-semibold text-gray-900">Friday</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Growth Rate</p>
                  <p className="text-lg font-semibold text-green-600">+12.5%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}