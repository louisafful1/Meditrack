import { Server } from 'socket.io';

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join facility-specific room
    socket.on('join-facility', (facilityId) => {
      socket.join(`facility-${facilityId}`);
      console.log(`Socket ${socket.id} joined facility-${facilityId}`);
    });

    // Join user-specific room
    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} joined user-${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Function to emit notification to specific facility
const emitNotificationToFacility = (facilityId, notification) => {
  if (io) {
    io.to(`facility-${facilityId}`).emit('new-notification', notification);
    console.log(`Notification emitted to facility-${facilityId}:`, notification.title);
  }
};

// Function to emit notification to specific user
const emitNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user-${userId}`).emit('new-notification', notification);
    console.log(`Notification emitted to user-${userId}:`, notification.title);
  }
};

// Function to emit notification globally
const emitNotificationGlobally = (notification) => {
  if (io) {
    io.emit('new-notification', notification);
    console.log('Notification emitted globally:', notification.title);
  }
};

export { 
  initializeSocket, 
  getSocketInstance, 
  emitNotificationToFacility, 
  emitNotificationToUser, 
  emitNotificationGlobally 
};
