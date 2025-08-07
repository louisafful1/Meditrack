import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, LogOut } from "lucide-react"; // LogOut is used in the dropdown
import NotificationsPopup from "./NotificationsPopup";
import { logout, RESET_AUTH, getUserProfile } from "../../redux/auth/authSlice";

const Header = ({ title }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);

    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        if (!user) {
            dispatch(getUserProfile()); // Ensure user data is fetched
        }
    }, [dispatch, user]);

    const toggleDropdown = () => setShowDropdown((prev) => !prev);

    const logoutUser = async () => {
        await dispatch(logout());
        await dispatch(RESET_AUTH());
        navigate('/login');
    };

    return (
        <header className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg border-b border-gray-700 z-40" style={{ position: 'relative' }}>
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                {/* Header Title: Truncates text and adds padding on small screens */}
                <h1 className="text-2xl font-semibold text-gray-100 truncate pr-2">
                    {title}
                </h1>

                <div className="flex items-center gap-4 relative" style={{ zIndex: 1000 }}>
                    {/* Facility Badge: Hidden on small screens, shown on medium and up */}
                    <span className="
                        hidden                /* Default: display: none; */
                        md:inline-flex        /* On md breakpoint (768px+): display: inline-flex; */
                        items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 
                        font-mono uppercase tracking-wider whitespace-nowrap
                    ">
                        {user?.facility?.name || "Loading..."}
                    </span>

                    <NotificationsPopup />

                    {/* User Profile Section */}
                    <div className="relative">
                        <button
                            onClick={toggleDropdown}
                            className="flex items-center space-x-2 focus:outline-none"
                        >
                            <UserCircle size={32} className="text-indigo-400" />
                            {/* User Name: Hidden on small screens, shown on small breakpoint and up */}
                            <span className="text-sm font-medium text-gray-200 sm:inline">
                                {user?.name || "User"}
                            </span>
                        </button>

                        {/* Dropdown Menu */}
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