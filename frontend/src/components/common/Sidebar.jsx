// frontend/src/components/common/Sidebar.jsx
import { AlertCircle, FileBarChart, LayoutDashboard, Menu, Package, Pill, Truck, UsersIcon } from "lucide-react";
import React, { useState } from "react"; // Explicitly import React
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux"; // Import useSelector

const SIDEBAR_ITEMS = [
    { name: "Dashboard", icon: LayoutDashboard, color: "#6366f1", href: "/", allowedRoles: [] },
    { name: "Dispense", icon: Pill, color: "#8B5CF6", href: "/dispense", allowedRoles: ['admin', 'staff', 'pharmacist'] },
    { name: "Inventory", icon: Package, color: "#10B981", href: "/inventory", allowedRoles: ['admin', 'staff', 'pharmacist', 'supervisor'] },
    { name: "Redistribution", icon: Truck, color: "#3B82F6", href: "/redistribution", allowedRoles: ['admin', 'supervisor', 'pharmacist'] },
    { name: "Reports", icon: FileBarChart, color: "#FBBF24", href: "/reports", allowedRoles: ['admin', 'supervisor', 'pharmacist'] },
    { name: "Users", icon: UsersIcon, color: "#EC4899", href: "/users", allowedRoles: ['admin'] }, 
    { name: "Logs", icon: AlertCircle, color: "#6EE7B7", href: "/logs", allowedRoles: ['admin', 'supervisor'] }, 
];

const Sidebar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { user } = useSelector(state => state.auth); // Get the user object from Redux

    // If user object is not yet loaded, or for unauthenticated users, don't render anything
    // The PrivateRoute already handles full page access, this is just for link visibility
    if (!user) {
        return null; 
    }

    return (
        <motion.div
            className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${
                isSidebarOpen ? "w-64" : "w-20"
            }`}
            animate={{ width: isSidebarOpen ? 256 : 80 }}
        >
            <div className='h-full bg-gray-800 bg-opacity-50 backdrop-blur-md p-4 flex flex-col border-r border-gray-700'>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className='p-2 rounded-full hover:bg-gray-700 transition-colors max-w-fit'
                >
                    <Menu size={24} />
                </motion.button>

                <nav className='mt-8 flex-grow'>
                    {SIDEBAR_ITEMS.map((item) => {
                        // Determine if the current user's role allows rendering this item
                        const shouldRender = item.allowedRoles.length === 0 || item.allowedRoles.includes(user.role);

                        if (shouldRender) {
                            return (
                                <Link key={item.href} to={item.href}>
                                    <motion.div className='flex items-center p-4 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-2'>
                                        <item.icon size={20} style={{ color: item.color, minWidth: "20px" }} />
                                        <AnimatePresence>
                                            {isSidebarOpen && (
                                                <motion.span
                                                    className='ml-4 whitespace-nowrap'
                                                    initial={{ opacity: 0, width: 0 }}
                                                    animate={{ opacity: 1, width: "auto" }}
                                                    exit={{ opacity: 0, width: 0 }}
                                                    transition={{ duration: 0.2, delay: 0.3 }}
                                                >
                                                    {item.name}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </Link>
                            );
                        }
                        return null; // Don't render the item if the user doesn't have the required role
                    })}
                </nav>
            </div>
        </motion.div>
    );
};
export default Sidebar;