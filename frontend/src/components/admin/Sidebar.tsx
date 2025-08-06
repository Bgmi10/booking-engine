import { useState, useEffect } from "react";
import { 
  RiDashboardLine,
  RiHotelBedLine,
  RiCalendarCheckLine,
  RiSettings4Line,
  RiLogoutBoxLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiShoppingBasketLine,
  RiFileTextLine,
  RiNotification3Line,
  RiListCheck,
  RiRobot2Line,
  RiOrderPlayFill,
  RiKnifeLine,
  RiCupLine,
  RiVipDiamondLine,
  RiMoneyEuroCircleLine,
  RiShareLine
} from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import { Ticket, Users2 } from "lucide-react";
import DailyActionDrawer from "./notifications/DailyActionDrawer";
import useWindowSize from "../../hooks/useWindowSize";

export default function Sidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  currentPage, 
  setCurrentPage 
}: { 
    isSidebarOpen: boolean,
    setIsSidebarOpen: (isOpen: boolean) => void,
    currentPage: string,
    setCurrentPage: (currentPage: string) => void
}) {
  const [activeMenu, setActiveMenu] = useState(currentPage);
  const { logout, user } = useAuth();
  const [dailyDrawerOpen, setDailyDrawerOpen] = useState(false);
  const { width } = useWindowSize();
  
  useEffect(() => {
    setActiveMenu(currentPage);
  }, [currentPage]);

  const menus = [
    { id: 1, title: "Dashboard", path: "dashboard", icon: <RiDashboardLine size={20} /> },
    { id: 3, title: "Rooms", path: "rooms", icon: <RiHotelBedLine size={20} /> },
    { id: 4, title: "Bookings", path: "bookings", icon: <RiCalendarCheckLine size={20} /> },
    { id: 18, title: "Channel Manager", path: "channel-manager", icon: <RiShareLine size={20} /> },
    { id: 16, title: "Wedding", path: "wedding-proposals", icon: <RiVipDiamondLine size={20} /> },
    { id: 17, title: "Revenue Management", path: "revenue-management", icon: <RiMoneyEuroCircleLine size={20} /> },
    { id: 111, title: "Notifications", path: "notifications", icon: <RiNotification3Line size={20} /> },
    { id: 5, title: "Enhancements", path: "enhancements", icon: <RiShoppingBasketLine size={20} /> },
    { id: 6, title: "Settings", path: "settings", icon: <RiSettings4Line size={20} /> },
    { id: 8, title: "Rate Policies", path: "ratepolicies", icon: <RiFileTextLine size={20} /> },
    { id: 9, title: "Voucher", path: "vouchers", icon: <Ticket size={20} /> },
    { id: 10, title: "Customers", path: "customers", icon: <Users2 size={20} /> },
    { id: 11, title: "Daily Action List", path: "#daily-action-list", icon: <RiListCheck size={20} /> },
    { id: 12, title: "Automated Task Rules", path: "automated-task-rules", icon: <RiRobot2Line size={20} /> },
    { id: 14, title: "Kitchen Orders", path: "kitchen-orders", icon: <RiKnifeLine size={20} /> },
    { id: 15, title: "Waiter Orders", path: "waiter-orders", icon: <RiCupLine size={20} /> },
    { id: 13, title: "Product management", path: "order-items", icon: <RiOrderPlayFill size={20} /> },
  ];

  const getVisibleMenus = () => {
    if (user?.role === 'KITCHEN') {
      return menus.filter(menu => ['kitchen-orders', 'profile', 'notifications'].includes(menu.path));
    }
    if (user?.role === 'WAITER') {
      return menus.filter(menu => ['waiter-orders', 'profile', 'notifications'].includes(menu.path));
    }
    if (user?.role === 'MANAGER') {
      return menus.filter(menu => !['wedding-proposals'].includes(menu.path));
    }
    if (user?.role !== 'ADMIN') {
      return menus.filter(menu => !['wedding-proposals', 'revenue-management'].includes(menu.path));
    }
    return menus;
  };

  const visibleMenus = getVisibleMenus();

  return (
    <>
      <div className={`
        ${isSidebarOpen ? "w-64" : "w-20"} 
        h-full bg-white shadow-lg transition-all duration-300
      `}>
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200">
          {isSidebarOpen && <span className="text-lg font-bold text-gray-800">Admin</span>}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-600"
          >
            {isSidebarOpen ? <RiMenuFoldLine size={20} /> : <RiMenuUnfoldLine size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <div className="py-4 flex flex-col h-[calc(100%-8rem)] overflow-y-auto">
          {visibleMenus.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.title === "Daily Action List") {
                  setDailyDrawerOpen(true);
                } else {
                  setCurrentPage(item.path);
                  setDailyDrawerOpen(false);
                }
                if (width && width < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              className={`flex items-center cursor-pointer py-3 transition-all duration-200 
                ${isSidebarOpen ? 'px-4 mx-2 my-1 rounded-md' : 'px-0 justify-center mx-0'}
                ${activeMenu === item.path
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title={isSidebarOpen ? '' : item.title}
            >
              <div className={isSidebarOpen ? 'mr-3' : ''}>{item.icon}</div>
              {isSidebarOpen && <span className="text-sm font-medium">{item.title}</span>}
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 w-full border-t border-gray-200">
          <div
            onClick={logout}
            className={`flex items-center cursor-pointer text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200
            ${isSidebarOpen ? 'px-4 mx-2 my-2 rounded-md py-3' : 'py-4 justify-center'}
            `}
            title={isSidebarOpen ? '' : 'Logout'}
          >
            <div className={isSidebarOpen ? 'mr-3' : ''}>
              <RiLogoutBoxLine size={20} />
            </div>
            {isSidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </div>
        </div>
      </div>
      {user && (
        <DailyActionDrawer open={dailyDrawerOpen} onClose={() => setDailyDrawerOpen(false)} user={user} />
      )}
    </>
  );
}