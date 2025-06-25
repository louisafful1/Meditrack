import { useState } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NotificationsPopup = () => {
  const [open, setOpen] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "New drug shipment received",
      message: "Paracetamol 500mg x 1000 units arrived at warehouse",
      time: "2 mins ago",
      read: false
    },
    {
      id: 2,
      title: "Inventory alert",
      message: "Amoxicillin stock below minimum threshold",
      time: "1 hour ago",
      read: true
    },
    {
      id: 3,
      title: "Expiry warning",
      message: "5 drugs expiring in next 15 days",
      time: "3 hours ago",
      read: true
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-gray-700 relative"
      >
        <Bell size={20} className="text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50"
          >
            <div className="p-3 border-b border-gray-700">
              <h3 className="font-semibold text-white text-sm">Notifications</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length ? (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-gray-800 hover:bg-gray-800 cursor-pointer ${
                      !n.read ? "bg-gray-800/50" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{n.message}</p>
                      </div>
                      <span className="text-xs text-gray-500">{n.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No new notifications
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-700 text-center">
              <button className="text-sm text-indigo-400 hover:text-indigo-300">
                Mark all as read
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPopup;
