import { Route, Routes } from "react-router-dom";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LoginPage from "./pages/LoginPage";
import SetPasswordPage from "./pages/SetPasswordPage";
import DashboardPage from "./pages/Dashboard";
import DispensePage from "./pages/DispensePage";
import InventoryPage from "./pages/Inventory";
import RedistributionPage from "./pages/RedistributionPage";
import ReportPage from "./pages/ReportsPage";
import UsersManagement from "./pages/UsersManagement";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import PrivateRoute from "../utils/PrivateRoute";
import Layout from "./components/common/Layout";
import { useDispatch, useSelector } from "react-redux";
import { getUserProfile } from "./redux/auth/authSlice";
import { useEffect } from "react";
import QRCodeGenerator from "../utils/QRCodeGenerator";

function App() {
  axios.defaults.withCredentials = true;
  axios.defaults.baseURL = 'http://localhost:5000';
  const dispatch = useDispatch();
  const { isInitialized } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only fetch user profile if app hasn't been initialized yet
    if (!isInitialized) {
      dispatch(getUserProfile()); // try to load the user from server
    }
  }, [dispatch, isInitialized]);
  
  return (
    <>
    
      <ToastContainer />
      <div className="h-screen bg-gray-900 text-gray-100 overflow-hidden">
        <Routes>
          {/* Public Routes */}
                    <Route path="/qr" element={<QRCodeGenerator />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password/:resetToken" element={<SetPasswordPage />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dispense" element={<DispensePage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/redistribution" element={<RedistributionPage />} />
              <Route path="/reports" element={<ReportPage />} />
              <Route path="/users" element={<UsersManagement />} />
              <Route path="/logs" element={<ActivityLogsPage />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
