import { useState, useEffect } from "react";
import { 
  RiMoneyEuroCircleLine, 
  RiExchangeFundsLine,
  RiCalendarLine,
  RiFilterLine,
  RiDownloadLine,
  RiIdCardFill
} from "react-icons/ri";
import { baseUrl } from "../../../utils/constants";

export default function PaymentHistory() {
  const [activePaymentType, setActivePaymentType] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentData, setPaymentData] = useState<any[]>([]);

  const paymentTypes = [
    { id: "all", name: "All Payments", icon: <RiExchangeFundsLine className="w-5 h-5" /> },
    { id: "cash", name: "Cash", icon: <RiMoneyEuroCircleLine className="w-5 h-5" /> },
    { id: "card", name: "Card/Stripe", icon: <RiIdCardFill className="w-5 h-5" /> },
    { id: "bank", name: "Bank Transfer", icon: <RiExchangeFundsLine className="w-5 h-5" /> }
  ];

  useEffect(() => {
    fetchPaymentHistory();
  }, [selectedDate, activePaymentType]);

  const fetchPaymentHistory = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        paymentType: activePaymentType
      });

      const response = await fetch(`${baseUrl}/admin/revenue/payments/history?${params}`, {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Transform the grouped data from backend to flat array for display
          const flatData = data.data.flatMap((waiterGroup: any) => 
            Object.entries(waiterGroup.paymentMethods).map(([method, details]: [string, any]) => ({
              id: `${waiterGroup.waiterId}-${method}`,
              waiterId: waiterGroup.waiterId,
              waiterName: waiterGroup.waiterName,
              paymentType: method.toLowerCase(),
              amount: details.totalAmount,
              orderCount: details.orderCount,
              timestamp: new Date().toISOString()
            }))
          );
          setPaymentData(flatData);
        }
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      // Keep empty array on error
      setPaymentData([]);
    }
  };

  const filteredData = paymentData.filter(payment => 
    activePaymentType === "all" || payment.paymentType === activePaymentType
  );

  const getPaymentTypeIcon = (type: string) => {
    switch(type) {
      case "cash":
        return <RiMoneyEuroCircleLine className="w-5 h-5 text-green-600" />;
      case "card":
        return <RiIdCardFill className="w-5 h-5 text-blue-600" />;
      case "bank":
        return <RiExchangeFundsLine className="w-5 h-5 text-purple-600" />;
      default:
        return <RiExchangeFundsLine className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTotalAmount = () => {
    return filteredData.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2);
  };

  const getTotalOrders = () => {
    return filteredData.reduce((sum, payment) => sum + payment.orderCount, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
          <p className="text-sm text-gray-500">View detailed payment history by waiter and payment method</p>
        </div>
        
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <RiCalendarLine className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <RiFilterLine className="w-4 h-4 mr-2" />
            Filter
          </button>
          
          <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <RiDownloadLine className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Payment Type Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {paymentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActivePaymentType(type.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activePaymentType === type.id
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

        {/* Summary Cards */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <RiMoneyEuroCircleLine className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-xl font-semibold text-gray-900">€{getTotalAmount()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <RiExchangeFundsLine className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <p className="text-xl font-semibold text-gray-900">{getTotalOrders()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <RiIdCardFill className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Avg. Order</p>
                  <p className="text-xl font-semibold text-gray-900">
                    €{getTotalOrders() > 0 ? (parseFloat(getTotalAmount()) / getTotalOrders()).toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="overflow-x-auto">
          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <RiMoneyEuroCircleLine className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payment history</h3>
              <p className="mt-1 text-sm text-gray-500">
                No payments found for the selected date and payment type.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waiter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {payment.waiterName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.waiterName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPaymentTypeIcon(payment.paymentType)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {payment.paymentType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.orderCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}