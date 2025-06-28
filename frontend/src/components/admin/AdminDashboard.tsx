import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Users from "./user/Users";
import Rooms from "./room/Rooms";
import Bookings from ".//bookings/Bookings";
import Settings from "./settings/Settings";
import Profile from "./Profile";
import AdminHeader from "./AdminHeader";
import Enhancements from "./enhancements/Enhancements";
import Ratepolicy from "./ratepolicies/Ratepolicy";
import Voucher from "./voucher/Voucher";
import Customer from "./customers/Customer";
import NotificationList from "./notifications/NotificationList";
import AutomatedTaskRules from './automated/AutomatedTaskRules';
import OrderItems from "./orderItems/OrderItems";
import KitchenOrders from "./kitchen/KitchenOrders";
import WaiterOrders from "./waiter/WaiterOrders";
import { initAdminWebSocket, subscribeWebSocket, unsubscribeWebSocket } from "../../utils/websocket";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { isAuthenticated: isAdminAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAdminAuthenticated) return;

    initAdminWebSocket();

    const handleMessage = (data: any) => {
      // Handle admin events here
      console.log("Admin WS event:", data);
    };

    subscribeWebSocket(handleMessage);
    return () => unsubscribeWebSocket(handleMessage);
  }, [isAdminAuthenticated]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <AdminHeader onViewAllNotifications={() => setCurrentPage('notifications')} />
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-white shadow-md`}>
          <Sidebar 
            isSidebarOpen={isSidebarOpen} 
            setIsSidebarOpen={setIsSidebarOpen} 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage} 
          /> 
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {currentPage === "dashboard" && <Dashboard />}
          {currentPage === "users" && <Users />}
          {currentPage === "rooms" && <Rooms />}
          {currentPage === "bookings" && <Bookings />}
          {currentPage === "enhancements" && <Enhancements />}
          {currentPage === "settings" && <Settings />}
          {currentPage === "profile" && <Profile />}
          {currentPage === "ratepolicies" && <Ratepolicy />}
          {currentPage === "vouchers" && <Voucher />}
          {currentPage === "customers" && <Customer />}
          {currentPage === "notifications" && <NotificationList />}
          {currentPage === "automated-task-rules" && <AutomatedTaskRules />}
          {currentPage === "order-items" && <OrderItems />}
          {currentPage === "kitchen-orders" && <KitchenOrders />}
          {currentPage === "waiter-orders" && <WaiterOrders />}
        </div>
      </div>
    </div>
  );
}