import { Route, Routes } from "react-router-dom";

import Sidebar from "./components/common/Sidebar";
import DashboardPage from "./pages/Dashboard";
import DispensePage from "./pages/DispensePage";
import InventoryPage from "./pages/Inventory";
import RedistributionPage from "./pages/RedistributionPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import UsersManagement from "./pages/UsersManagement";
import SetPasswordPage from "./pages/SetPasswordPage";  
import LoginPage from "./pages/Loginpage";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"
import ReportPage from "./pages/ReportsPage";
import PrivateRoute from "../utils/PrivateRoute";

function App() {
  axios.defaults.withCredentials =true;
  return (
    <>
    <ToastContainer />
    <div className="h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/set-password/:resetToken" element={<SetPasswordPage />} />

        {/* Protected Routes */}
<Route element={<PrivateRoute />}>
        <Route
          path="/*"
          element={
            <div className="flex h-full">
              {/* BG */}
              <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
                <div className="absolute inset-0 backdrop-blur-sm" />
              </div>

              <Sidebar />
              <div className="flex-1 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/dispense" element={<DispensePage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/redistribution" element={<RedistributionPage />} />
                  <Route path="/reports" element={<ReportPage />} />
                  <Route path="/users" element={<UsersManagement />} />
                  <Route path="/logs" element={<ActivityLogsPage />} />
                </Routes>
              </div>
            </div>
          }
        />
</Route>
      </Routes>
    </div>
    </>
  );
}

export default App;
