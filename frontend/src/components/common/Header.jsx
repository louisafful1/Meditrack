import { useState } from "react";
import { UserCircle, LogOut } from "lucide-react";
import NotificationsPopup from "./NotificationsPopup";
import { logout, RESET_AUTH } from "../../redux/auth/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";



const Header = ({ title, user = { name: "Admin", facility: "Holy Family Hospital" }, onLogout }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => setShowDropdown((prev) => !prev);
  const logoutUser = async () => {
    await dispatch(logout());
    await dispatch(RESET_AUTH());
    navigate('/login')
  }

  return (
    <header className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg border-b border-gray-700 z-10">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-100">{title}</h1>

        <div className="flex items-center gap-4 relative">
          {/* Facility Badge */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 font-mono uppercase tracking-wider whitespace-nowrap">
            {user.facility}
          </span>

          {/* Notifications */}
          <NotificationsPopup />

          {/* Profile */}
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <UserCircle size={32} className="text-indigo-400" />
              <span className="text-sm font-medium text-gray-200 hidden sm:inline">{user.name}</span>
            </button>
            <div className="flex items-center gap-4">
  {/* other controls */}
</div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded-md shadow-md z-50">
                <button
                  onClick={logoutUser}
                  className="w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center"
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;