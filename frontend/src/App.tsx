import { useEffect, useState } from "react";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLogin from "./components/admin/AdminLogin";
import AdminProtectedRoutes from "./components/admin/AdminProtectedRoutes";
import WeddingPortalProtectedRoutes from "./components/wedding-portal/WeddingPortalProtectedRoutes";
import Booking from "./components/Booking";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LaTorreLoader from "./components/LatorreLoader";
import Success from "./components/Success";
import Failure from "./components/Failure";
import PaymentIntentStatus from "./components/PaymentIntentStatus";
import SecondPaymentStatus from "./components/SecondPaymentStatus";
import Qrcode from "./components/admin/customers/Qrcode";
import { ChargeStatus } from "./components/ChargeStatus";
import Order from "./components/orders/Order";
import CustomerVerify from "./components/orders/CustomerVerify";
import { WeddingPortalLogin } from "./components/wedding-portal/WeddingPortalLogin";
import { WeddingPortalActivation } from "./components/wedding-portal/WeddingPortalActivation";
import { WeddingPortalPasswordReset } from "./components/wedding-portal/WeddingPortalPasswordReset";
import { WeddingPortalAuthProvider } from "./context/WeddingPortalAuthContext";
import WeddingPortalDashboard from "./components/wedding-portal/WeddingPortalDashboard";
import { OnlineCheckInVerify } from "./components/onlinecheckin/OnlineCheckInVerify";
import { OnlineCheckIn } from "./components/onlinecheckin/OnlineCheckIn";
import { CheckInSuccess } from "./components/onlinecheckin/CheckInSuccess";
import { OnlineCheckInHome } from "./components/onlinecheckin/OnlineCheckInHome";
import { ManageGuests } from "./components/onlinecheckin/ManageGuests";
import { OnlineCheckInProtectedRoutes } from "./components/onlinecheckin/OnlineCheckInProtectedRoutes";

function App() {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShowLoader(false);
    }, 2000);
  }, []);

  return (
    <Router>
      <WeddingPortalAuthProvider>
        <Routes>
          <Route path="/" element={ showLoader ? <LaTorreLoader /> : <Booking />} />
          <Route path="/payment-intent/:id/check-status" element={<PaymentIntentStatus />} />
          <Route path="/payment-intent/:id/check-second-payment-status" element={<SecondPaymentStatus />} />
          <Route path="/charge/:id" element={<ChargeStatus />} />
          <Route path="/booking/success" element={<Success />} />
          <Route path="/booking/failure" element={<Failure />} />
          <Route path="/customers/order-items" element={<Order />} /> 
          <Route path="/customers/verify" element={
            //@ts-ignore
            <CustomerVerify />} /> 
          <Route element={<AdminProtectedRoutes />}>  
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/online-checkin/:token" element={<OnlineCheckInVerify />} />
          <Route element={<OnlineCheckInProtectedRoutes />}>
          <Route path="/online-checkin/home" element={<OnlineCheckInHome />} />
           <Route path="/online-checkin" element={<OnlineCheckIn />} />
           <Route path="/online-checkin/manage-guests" element={<ManageGuests />} />
           <Route path="/online-checkin/success" element={<CheckInSuccess />} />
          </Route>
          <Route path="/wedding-portal/login" element={<WeddingPortalLogin />} />
          <Route path="/wedding-portal/activate-account" element={<WeddingPortalActivation />} />
          <Route path="/wedding-portal/reset-password" element={<WeddingPortalPasswordReset />} />
          <Route element={<WeddingPortalProtectedRoutes />}>
            <Route element={<WeddingPortalDashboard />} path="/wedding-portal/dashboard" /> 
          </Route>
          
          <Route path="/qr/:id" element={<Qrcode />} />
        </Routes>
      </WeddingPortalAuthProvider>
    </Router>
  )
}

export default App
