import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../../hooks/useSocket";
import axios from "axios";

const NotificationsPopup = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
  const [apiNotifications, setApiNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Get real-time notifications from socket
  const { 
    notifications: realtimeNotifications, 
    markNotificationAsRead, 
    removeNotification, 
    markAllNotificationsAsRead,
    isConnected 
  } = useSocket();

  // Fetch existing notifications from API on component mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/notifications', {
          params: { limit: 50, page: 1 }
        });
        if (response.data.notifications) {
          setApiNotifications(response.data.notifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Combine real-time and API notifications
  const allNotifications = [
    ...realtimeNotifications,
    ...apiNotifications.filter(apiNotif => 
      !realtimeNotifications.some(rtNotif => rtNotif._id === apiNotif._id)
    )
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalUnreadCount = allNotifications.filter(n => !n.isRead).length;

  // Update button position when opening dropdown
  const updateButtonPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY,
        right: window.innerWidth - rect.right
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!open) {
      updateButtonPosition();
    }
    setOpen(!open);
  };

  // Function to handle marking notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      markNotificationAsRead(notificationId);
      
      // Update API notifications as well
      setApiNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to handle deleting notification
  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation(); // Prevent marking as read when deleting
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      
      // Remove from both real-time and API notifications
      setApiNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      removeNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Function to handle marking all as read
  const handleMarkAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      
      // Update all notifications to read status
      setApiNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      
      // Mark all real-time notifications as read
      markAllNotificationsAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Function to format time ago
  const formatTimeAgo = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className="p-2 rounded-full hover:bg-gray-700 relative"
        >
          <Bell size={20} className="text-gray-300" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Portal for dropdown */}
      {open && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
            style={{
              zIndex: 9999,
              top: buttonPosition.top + 8,
              right: buttonPosition.right,
              maxHeight: '500px'
            }}
          >
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">
                  Notifications {totalUnreadCount > 0 && `(${totalUnreadCount})`}
                </h3>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                     title={isConnected ? 'Connected' : 'Disconnected'}>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  Loading notifications...
                </div>
              ) : allNotifications.length ? (
                allNotifications.map(notification => (
                  <div
                    key={notification._id}
                    className={`group p-3 border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                      !notification.isRead ? "bg-gray-800/50 border-l-4 border-l-blue-500" : ""
                    }`}
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleMarkAsRead(notification._id)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-white truncate">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                              notification.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                              notification.priority === 'HIGH' ? 'bg-orange-600 text-white' :
                              notification.priority === 'MEDIUM' ? 'bg-yellow-600 text-black' :
                              'bg-blue-600 text-white'
                            }`}>
                              {notification.priority}
                            </span>
                            
                            <span className={`text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 flex-shrink-0 ${
                              notification.type === 'DRUG_EXPIRED' ? 'bg-red-700' :
                              notification.type === 'DRUG_EXPIRING' ? 'bg-yellow-700' :
                              notification.type === 'OUT_OF_STOCK' ? 'bg-red-700' :
                              notification.type === 'LOW_STOCK' ? 'bg-orange-700' :
                              'bg-gray-700'
                            }`}>
                              {notification.type.replace(/_/g, ' ')}
                            </span>
                            
                            {notification.drugName && (
                              <span className="text-xs text-gray-500 truncate">
                                {notification.drugName}
                              </span>
                            )}
                            
                            {notification.batchNumber && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500 truncate">
                                  Batch: {notification.batchNumber}
                                </span>
                                
                                {/* Delete button - positioned after batch name */}
                                <button
                                  onClick={(e) => handleDeleteNotification(notification._id, e)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all flex-shrink-0 ml-1"
                                  title="Delete notification"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                            
                            {/* Delete button for notifications without batch number */}
                            {!notification.batchNumber && (
                              <button
                                onClick={(e) => handleDeleteNotification(notification._id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all flex-shrink-0 ml-1"
                                title="Delete notification"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          
                          {notification.facility?.name && (
                            <span className="text-xs text-gray-600 truncate max-w-20">
                              {notification.facility.name}
                            </span>
                          )}
                        </div>
                      </div>
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
              <button 
                onClick={handleMarkAllAsRead}
                className={`text-sm transition-colors ${
                  totalUnreadCount === 0 
                    ? 'text-gray-500 cursor-not-allowed' 
                    : 'text-indigo-400 hover:text-indigo-300'
                }`}
                disabled={totalUnreadCount === 0}
              >
                Mark all as read {totalUnreadCount > 0 && `(${totalUnreadCount})`}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default NotificationsPopup;
