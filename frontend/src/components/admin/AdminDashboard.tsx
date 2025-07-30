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
import { initAdminWebSocket } from "../../utils/websocket";
import { useAuth } from "../../context/AuthContext";
import CreateOrderModal from "./orders/CreateOrderModal";
import WeddingProposals from "./wedding-proposals/WeddingProposals";
import RevenueManagement from "./revenue/RevenueManagement";

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const { isAuthenticated: isAdminAuthenticated, user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const sidebar = params.get("sidebar");
  const [isNotificationsSheetOpen, setIsNotificationsSheetOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  useEffect(() => {
    if (sidebar) {
      setCurrentPage(sidebar);
    }
  }, [sidebar]);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    initAdminWebSocket();
  }, [isAdminAuthenticated]);

  const handleSidebarItemClick = (viewName: any) => {
    setCurrentPage(viewName);
    setIsNotificationsSheetOpen(false);
  };

  const handleViewAllNotifications = () => {
    setIsNotificationsSheetOpen(true);
  };

  const renderActiveView = () => {
    if (isNotificationsSheetOpen) {
      return <NotificationList />;
    }

    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "users":
        return <Users />;
      case "rooms":
        return <Rooms />;
      case "bookings":
        return <Bookings />;
      case "enhancements":
        return <Enhancements />;
      case "settings":
        return <Settings />;
      case "profile":
        return <Profile />;
      case "ratepolicies":
        return <Ratepolicy />;
      case "vouchers":
        return <Voucher />;
      case "customers":
        return <Customer />;
      case "automated-task-rules":
        return <AutomatedTaskRules />;
      case "order-items":
        return <OrderItems />;
      case "kitchen-orders":
        return <KitchenOrders />;
      case "waiter-orders":
        return <WaiterOrders />;
      case "wedding-proposals":
        return <WeddingProposals />;
      case "revenue-management":
        return <RevenueManagement />;
      default:
        if (user?.role === 'WAITER') return <WaiterOrders />;
        if (user?.role === 'KITCHEN') return <KitchenOrders />;
        return <div className="p-6 text-gray-700">Select an option from the sidebar.</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <AdminHeader 
        onViewAllNotifications={handleViewAllNotifications} 
        onCreateOrder={() => setIsCreateOrderModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`fixed md:relative z-40 h-full transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
          <Sidebar 
            isSidebarOpen={isSidebarOpen} 
            setIsSidebarOpen={setIsSidebarOpen} 
            currentPage={currentPage} 
            setCurrentPage={handleSidebarItemClick} 
          /> 
        </div>
        
        <main className="flex-1 overflow-auto p-4 bg-gray-50">
          {renderActiveView()}
        </main>
      </div>
      {isCreateOrderModalOpen && <CreateOrderModal onClose={() => setIsCreateOrderModalOpen(false)} />}
    </div>
  );
}