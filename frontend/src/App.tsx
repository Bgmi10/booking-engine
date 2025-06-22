import { useEffect, useState } from "react";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLogin from "./components/admin/AdminLogin";
import AdminProtectedRoutes from "./components/admin/AdminProtectedRoutes";
import Booking from "./components/Booking";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LaTorreLoader from "./components/LatorreLoader";
import Success from "./components/Success";
import Failure from "./components/Failure";
import PaymentIntentStatus from "./components/PaymentIntentStatus";
import Qrcode from "./components/admin/customers/Qrcode";
import { ChargeStatus } from "./components/ChargeStatus";

function App() {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShowLoader(false);
    }, 2000);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={ showLoader ? <LaTorreLoader /> : <Booking />} />
        <Route path="/payment-intent/:id/check-status" element={<PaymentIntentStatus />} />
        <Route path="/charge/:id" element={<ChargeStatus />} />
        <Route path="/booking/success" element={<Success />} />
        <Route path="/booking/failure" element={<Failure />} />
        <Route element={<AdminProtectedRoutes />}>  
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/qr/:id" element={<Qrcode />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>

    </Router>
  )
}

export default App
