import { useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../hooks/useSocket';

const NotificationTester = () => {
  const [loading, setLoading] = useState(false);
  const { isConnected } = useSocket();

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      await axios.post('/api/notifications/test', {
        title: 'Test Notification',
        message: `Test notification sent at ${new Date().toLocaleTimeString()}`,
        type: 'LOW_STOCK',
        priority: 'HIGH'
      });
      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Error sending test notification:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">WebSocket Notification Tester</h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">
            WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <button
        onClick={sendTestNotification}
        disabled={loading || !isConnected}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
      >
        {loading ? 'Sending...' : 'Send Test Notification'}
      </button>
    </div>
  );
};

export default NotificationTester;
