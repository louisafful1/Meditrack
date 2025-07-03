import { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const { userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      setIsConnected(true);
      
      // Join user-specific room if user is logged in
      if (userInfo?.id) {
        newSocket.emit('join-user', userInfo.id);
      }
      
      // Join facility-specific room if user has a facility
      if (userInfo?.facility) {
        newSocket.emit('join-facility', userInfo.facility);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Listen for new notifications
    newSocket.on('new-notification', (notification) => {
      console.log('Received new notification:', notification);
      setNotifications(prev => [notification, ...prev]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userInfo]);

  // Function to mark notification as read
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification._id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  // Function to clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Function to remove a specific notification
  const removeNotification = (notificationId) => {
    setNotifications(prev => 
      prev.filter(notification => notification._id !== notificationId)
    );
  };

  // Function to mark all notifications as read
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const value = {
    socket,
    isConnected,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    removeNotification,
    unreadCount: notifications.filter(n => !n.isRead).length
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export { SocketContext, SocketProvider };
