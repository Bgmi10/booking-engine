import { useState } from "react";
import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Users from "./user/Users";
import Rooms from "./room/Rooms";
import Bookings from ".//bookings/Bookings";
import Settings from "./Settings";
import Profile from "./Profile";
import Header from "../Header";
import Enhancements from "./enhancements/Enhancements";
import Ratepolicy from "./ratepolicies/Ratepolicy";

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <Header />
      
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
        </div>
      </div>
    </div>
  );
}