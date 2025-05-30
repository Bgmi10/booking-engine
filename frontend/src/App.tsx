import { useEffect, useState } from "react";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLogin from "./components/admin/AdminLogin";
import AdminProtectedRoutes from "./components/admin/AdminProtectedRoutes";
import Booking from "./components/Booking";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LaTorreLoader from "./components/LatorreLoader";
import Success from "./components/Success";
import Failure from "./components/Failure";

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
        <Route path="/booking/success" element={<Success />} />
        <Route path="/booking/failure" element={<Failure />} />
        <Route element={<AdminProtectedRoutes />}>  
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
      </Routes>

    </Router>
  )
}

export default App
