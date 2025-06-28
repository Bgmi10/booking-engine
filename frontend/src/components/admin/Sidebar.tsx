import { useState, useEffect } from "react";
import { 
  RiDashboardLine, 
  RiUser3Line, 
  RiHotelBedLine,
  RiCalendarCheckLine,
  RiSettings4Line,
  RiUserSettingsLine,
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
  RiCupLine
} from "react-icons/ri";
import { useAuth } from "../../context/AuthContext";
import { Ticket, Users2 } from "lucide-react";
import DailyActionDrawer from "./notifications/DailyActionDrawer";

export default function Sidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  currentPage, 
  setCurrentPage 
}: { 
    isSidebarOpen: boolean,
    setIsSidebarOpen: (isSidebarOpen: boolean) => void,
    currentPage: string,
    setCurrentPage: (currentPage: string) => void
}) {
  const [activeMenu, setActiveMenu] = useState(currentPage);
  const { logout, user } = useAuth();
  const [dailyDrawerOpen, setDailyDrawerOpen] = useState(false);
  
  // Update active menu when current page changes
  useEffect(() => {
    setActiveMenu(currentPage);
  }, [currentPage]);

  const menus = [
    {
      id: 1,
      title: "Dashboard",
      path: "dashboard",
      icon: <RiDashboardLine size={20} />
    },
    {
      id: 2,
      title: "Users",
      path: "users",
      icon: <RiUser3Line size={20} />
    },
    {
      id: 3,
      title: "Rooms",
      path: "rooms",
      icon: <RiHotelBedLine size={20} />
    },
    {
      id: 4,
      title: "Bookings",
      path: "bookings",
      icon: <RiCalendarCheckLine size={20} />
    },
    {
      id: 111,
      title: "Notifications",
      path: "notifications",
      icon: <RiNotification3Line size={20} />
    },
    {
      id: 5,
      title: "Enhancements",
      path: "enhancements",
      icon: <RiShoppingBasketLine size={20} />
    },
    {
      id: 6,
      title: "Settings",
      path: "settings",
      icon: <RiSettings4Line size={20} />
    },
    {
      id: 7,
      title: "Profile",
      path: "profile",
      icon: <RiUserSettingsLine size={20} />
    },
    {
      id: 8,
      title: "Rate Policies",
      path: "ratepolicies",
      icon: <RiFileTextLine size={20} />
    },
    {
      id: 9,
      title: "Voucher",
      path: "vouchers",
      icon: <Ticket size={20} />
    },
    {
      id: 10,
      title: "Customers",
      path: "customers",
      icon: <Users2 size={20} />
    },
    {
      id: 11,
      title: "Daily Action List",
      path: "#daily-action-list",
      icon: <RiListCheck size={20} />
    },
    {
      id: 12,
      title: "Automated Task Rules",
      path: "automated-task-rules",
      icon: <RiRobot2Line size={20} />
    },
    {
      id: 14,
      title: "Kitchen Orders",
      path: "kitchen-orders",
      icon: <RiKnifeLine size={20} />
    },
    {
      id: 15,
      title: "Waiter Orders",
      path: "waiter-orders",
      icon: <RiCupLine size={20} />
    },
    {
      id: 13,
      title: "Product management",
      path: "order-items",
      icon: <RiOrderPlayFill size={20} />
    },
  ];

  const getVisibleMenus = () => {
    if (user?.role === 'KITCHEN') {
      return menus.filter(menu => ['kitchen-orders', 'profile', 'notifications'].includes(menu.path));
    }
    if (user?.role === 'WAITER') {
      return menus.filter(menu => ['waiter-orders', 'profile', 'notifications'].includes(menu.path));
    }
    return menus;
  };

  const visibleMenus = getVisibleMenus();

  return (
    <>
      <div className={`${isSidebarOpen ? "w-64" : "w-20"} duration-300 h-screen bg-gray-800 text-white fixed left-0 top-22 z-50 transition-all `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
          {isSidebarOpen && (
            <div className="text-xl font-bold text-white">Admin Panel</div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`${!isSidebarOpen && "mx-auto"} p-2 rounded-md hover:bg-gray-700 focus:outline-none`}
          >
            {isSidebarOpen ? <RiMenuFoldLine size={20} /> : <RiMenuUnfoldLine size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <div className="py-4 flex flex-col h-[calc(100%-12rem)] overflow-y-auto">
          {visibleMenus.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.title === "Daily Action List") setDailyDrawerOpen(true);
                else setCurrentPage(item.path);
              }}
              className={`flex items-center cursor-pointer py-3 px-4 mx-2 my-1 rounded-md transition-all duration-200 ${
                activeMenu === item.path
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              }`}
            >
              <div className="mr-3">{item.icon}</div>
              {isSidebarOpen && <span className="text-sm font-medium">{item.title}</span>}
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-10 w-full border-t border-gray-700 py-4 bg-gray-700" onClick={logout}>
          <div
            className="flex items-center cursor-pointer text-gray-300 hover:text-white px-4 mx-2 py-3 hover:bg-gray-700 rounded-md transition-all duration-200"
          >
            <div className="mr-3">
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