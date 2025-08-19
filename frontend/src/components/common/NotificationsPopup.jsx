import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Trash2, Truck, CheckCircle, XCircle, AlertCircle, Info, Clock, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../../hooks/useSocket";
import { useSelector } from "react-redux";
import axios from "axios";
import { useNavigate } from 'react-router-dom';

// Helper to format time ago
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

// Component to render individual notification content based on type
const NotificationItemContent = ({ notification, currentUserFacilityId }) => {
    let icon;
    let mainMessage;
    let additionalDetails = [];
    let showPriorityBadge = true;

    // Default drug/batch info (will be overridden for redistribution types)
    if (notification.drugName) {
        additionalDetails.push(
            <span key="drug" className="text-xs text-gray-500 truncate">
                {notification.drugName}
            </span>
        );
    }
    if (notification.batchNumber) {
        additionalDetails.push(
            <span key="batch" className="text-xs text-gray-500 truncate">
                Batch: {notification.batchNumber}
            </span>
        );
    }

    switch (notification.type) {
        case 'DRUG_EXPIRED':
            icon = <AlertCircle size={16} className="text-red-500" />;
            mainMessage = `${notification.drugName} (Batch: ${notification.batchNumber}) has expired. Current stock: ${notification.metadata?.currentStock || 'N/A'}`;
            break;
        case 'DRUG_EXPIRING':
            icon = <Clock size={16} className="text-yellow-500" />;
            mainMessage = `${notification.drugName} (Batch: ${notification.batchNumber}) expires in ${notification.metadata?.daysToExpiry} days. Current stock: ${notification.metadata?.currentStock || 'N/A'}`;
            break;
        case 'LOW_STOCK':
            icon = <Info size={16} className="text-orange-500" />;
            mainMessage = `${notification.drugName} (Batch: ${notification.batchNumber}) has low stock: ${notification.metadata?.currentStock || 'N/A'} units remaining.`;
            break;
        case 'OUT_OF_STOCK':
            icon = <XCircle size={16} className="text-red-500" />;
            mainMessage = `${notification.drugName} (Batch: ${notification.batchNumber}) is out of stock.`;
            break;

        // --- Redistribution Notifications ---
        case 'REDISTRIBUTION_CREATED':
            icon = <Truck size={16} className="text-indigo-400" />;
            mainMessage = `New request for ${notification.metadata?.redistributionQuantity || 'N/A'} units of ${notification.drugName} from ${notification.redistributionId?.fromFacility?.name || 'Unknown Facility'}.`;
            additionalDetails = [
                <span key="to" className="text-xs text-gray-400">
                    To: <span className="font-semibold text-emerald-300">Your Facility</span>
                </span>,
                <span key="drug" className="text-xs text-gray-400">
                    Drug: <span className="font-semibold text-white">{notification.drugName}</span>
                </span>,
                <span key="qty" className="text-xs text-gray-400">
                    Qty: <span className="font-semibold text-white">{notification.metadata?.redistributionQuantity || 'N/A'}</span>
                </span>,
            ];
            showPriorityBadge = false;
            break;
        case 'REDISTRIBUTION_APPROVED':
        case 'REDISTRIBUTION_DECLINED':
            icon = notification.type === 'REDISTRIBUTION_APPROVED' ? <CheckCircle size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />;
            mainMessage = `Your request for ${notification.metadata?.redistributionQuantity || 'N/A'} units of ${notification.drugName} has been ${notification.type === 'REDISTRIBUTION_APPROVED' ? 'APPROVED' : 'DECLINED'}.`;
            additionalDetails = [
                <span key="to" className="text-xs text-gray-400">
                    To: <span className={`font-semibold ${notification.type === 'REDISTRIBUTION_APPROVED' ? 'text-emerald-300' : 'text-red-300'}`}>
                        {notification.redistributionId?.toFacility?.name || 'Unknown Facility'}
                    </span>
                </span>,
                <span key="drug" className="text-xs text-gray-400">
                    Drug: <span className="font-semibold text-white">{notification.drugName}</span>
                </span>,
                <span key="qty" className="text-xs text-gray-400">
                    Qty: <span className="font-semibold text-white">{notification.metadata?.redistributionQuantity || 'N/A'}</span>
                </span>,
            ];
            showPriorityBadge = false;
            break;
        case 'REDISTRIBUTION_COMPLETED':
            icon = <Package size={16} className="text-purple-400" />;
            mainMessage = `${notification.metadata?.redistributionQuantity || 'N/A'} units of ${notification.drugName} successfully received.`;
            additionalDetails = [
                <span key="from" className="text-xs text-gray-400">
                    From: <span className="font-semibold text-blue-300">
                        {notification.redistributionId?.fromFacility?.name || 'Unknown Facility'}
                    </span>
                </span>,
                <span key="to" className="text-xs text-gray-400">
                    To: <span className="font-semibold text-emerald-300">Your Facility</span>
                </span>,
                <span key="drug" className="text-xs text-gray-400">
                    Drug: <span className="font-semibold text-white">{notification.drugName}</span>
                </span>,
                <span key="qty" className="text-xs text-gray-400">
                    Qty: <span className="font-semibold text-white">{notification.metadata?.redistributionQuantity || 'N/A'}</span>
                </span>,
            ];
            showPriorityBadge = false;
            break;

        default:
            icon = <Bell size={16} className="text-gray-400" />;
            mainMessage = notification.message;
            break;
    }

    return (
        <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-1">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">
                        {notification.title}
                    </p>
                    {showPriorityBadge && notification.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            notification.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                            notification.priority === 'HIGH' ? 'bg-orange-600 text-white' :
                            notification.priority === 'MEDIUM' ? 'bg-yellow-600 text-black' :
                            'bg-blue-600 text-white'
                        }`}>
                            {notification.priority}
                        </span>
                    )}
                    {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    )}
                </div>

                <p className="text-xs text-gray-400 mb-1 line-clamp-2">
                    {mainMessage}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Type Badge */}
                    <span className={`text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 flex-shrink-0 ${
                        notification.type.includes('REDISTRIBUTION') ? 'bg-indigo-700' :
                        notification.type === 'DRUG_EXPIRED' || notification.type === 'OUT_OF_STOCK' ? 'bg-red-700' :
                        notification.type === 'DRUG_EXPIRING' ? 'bg-yellow-700' :
                        notification.type === 'LOW_STOCK' ? 'bg-orange-700' :
                        'bg-gray-700'
                    }`}>
                        {notification.type.replace(/_/g, ' ')}
                    </span>
                    {additionalDetails}
                </div>
            </div>
        </div>
    );
};


const NotificationsPopup = () => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
    const [apiNotifications, setApiNotifications] = useState([]);
    const [loading, setLoading] = useState(false); // Corrected typo, previously 'false' directly

    const navigate = useNavigate();

    // Get user info from Redux
    const { user } = useSelector((state) => state.auth);

    // Get real-time notifications from socket
    const {
        notifications: realtimeNotifications,
        markNotificationAsRead,
        removeNotification,
        markAllNotificationsAsRead,
        clearNotifications,
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
        event.stopPropagation(); // Prevent triggering parent click handler
        try {
            await axios.delete(`/api/notifications/${notificationId}`);

            setApiNotifications(prev => prev.filter(notif => notif._id !== notificationId));
            removeNotification(notificationId);
        }
         catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // New function to handle clicking on a notification for navigation
    const handleNotificationClick = async (notification) => {
        // First, mark the notification as read
        if (!notification.isRead) {
            await handleMarkAsRead(notification._id);
        }

        // Close the notification popup
        setOpen(false);

        // Determine where to navigate based on notification type
        switch (notification.type) {
            case 'DRUG_EXPIRED':
            case 'DRUG_EXPIRING':
            case 'LOW_STOCK':
            case 'OUT_OF_STOCK':
                // For inventory-related notifications, navigate to the general inventory page
                // We'll rely on the user to find the item or implement a search/filter on that page
                navigate(`/inventory`); 
                break;
            case 'REDISTRIBUTION_CREATED':
            case 'REDISTRIBUTION_APPROVED':
            case 'REDISTRIBUTION_DECLINED':
            case 'REDISTRIBUTION_COMPLETED':
                // For redistribution notifications, navigate to the redistribution page
                // and pass the redistribution ID as state for scrolling
                if (notification.redistributionId) {
                    navigate('/redistribution', { state: { highlightId: notification.redistributionId._id || notification.redistributionId } });
                } else {
                    // Fallback to general redistribution list if ID is missing
                    navigate(`/redistribution`);
                }
                break;
            // Add more cases for other notification types if needed
            default:
                // Default to a general dashboard or notifications page if no specific route
                navigate('/dashboard'); 
                break;
        }
    };


    // Function to handle marking all as read
    const handleMarkAllAsRead = async () => {
        if (totalUnreadCount === 0) return;

        try {
            const requestBody = {};
            if (user?.id) {
                requestBody.userId = user.id;
            }
            if (user?.facility) {
                requestBody.facilityId = typeof user.facility === 'object' ? user.facility._id : user.facility;
            }

            await axios.put('/api/notifications/mark-all-read', requestBody);

            setApiNotifications(prev =>
                prev.map(notif => ({ ...notif, isRead: true }))
            );

            markAllNotificationsAsRead();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Function to handle clearing all notifications
    const handleClearAll = async () => {
        if (allNotifications.length === 0) return;

        try {
            const deletePromises = allNotifications.map(notification =>
                axios.delete(`/api/notifications/${notification._id}`)
            );

            await Promise.all(deletePromises);

            setApiNotifications([]);
            clearNotifications();
        } catch (error) {
            console.error('Error clearing all notifications:', error);
        }
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

                            {/* Clear all button */}
                            {allNotifications.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-red-900/20"
                                    title="Clear all notifications"
                                >
                                    Clear all
                                </button>
                            )}
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
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <NotificationItemContent notification={notification} />
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <button
                                                onClick={(e) => handleDeleteNotification(notification._id, e)}
                                                className="p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0 cursor-pointer"
                                                title="Delete notification"
                                            >
                                                <Trash2 size={14} />
                                            </button>
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
                                className={`text-sm transition-colors cursor-pointer ${
                                    totalUnreadCount === 0
                                        ? 'text-gray-500 cursor-not-allowed'
                                        : 'text-indigo-400 hover:text-indigo-300 cursor-pointer'
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
