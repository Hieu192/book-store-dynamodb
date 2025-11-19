/**
 * WebSocket Server Configuration
 * Real-time notifications for orders, reviews, etc.
 */

const WebSocket = require('ws');

let wss = null;
const clients = new Map(); // Map<userId, WebSocket>

/**
 * Initialize WebSocket server
 */
const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection');

    // Handle authentication
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // Register user connection
        if (data.type === 'auth' && data.userId) {
          clients.set(data.userId, ws);
          console.log(`✅ User ${data.userId} authenticated`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Connected to notification service'
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error.message);
      }
    });

    ws.on('close', () => {
      // Remove client on disconnect
      for (const [userId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(userId);
          console.log(`❌ User ${userId} disconnected`);
          break;
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  });

  console.log('✅ WebSocket server initialized');
  return wss;
};

/**
 * Send notification to specific user
 */
const sendNotification = (userId, notification) => {
  const client = clients.get(userId);
  
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
};

/**
 * Send notification to all admin users
 */
const sendAdminNotification = (notification) => {
  let sent = 0;
  
  for (const [userId, client] of clients.entries()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      }));
      sent++;
    }
  }
  
  return sent;
};

/**
 * Broadcast notification to all connected users
 */
const broadcastNotification = (notification) => {
  let sent = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      }));
      sent++;
    }
  });
  
  return sent;
};

/**
 * Get connected clients count
 */
const getConnectedCount = () => {
  return clients.size;
};

/**
 * Close WebSocket server
 */
const closeWebSocket = () => {
  if (wss) {
    wss.close(() => {
      console.log('✅ WebSocket server closed');
    });
  }
};

module.exports = {
  initWebSocket,
  sendNotification,
  sendAdminNotification,
  broadcastNotification,
  getConnectedCount,
  closeWebSocket
};
