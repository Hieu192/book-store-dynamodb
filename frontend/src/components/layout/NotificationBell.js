import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import './NotificationBell.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const dropdownRef = useRef(null);

  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:4000/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Connected to notification service');
      setIsConnected(true);
      
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user._id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'notification') {
          const newNotification = {
            id: Date.now(),
            ...message.data,
            timestamp: message.timestamp,
            read: false
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(message.data.title, {
              body: message.data.message,
              icon: '/logo192.png'
            });
          }
        }
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    ws.onclose = () => {
      console.log('❌ Disconnected from notification service');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      // Mark all as read when opening
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_created':
      case 'order_updated':
      case 'order_delivered':
        return '📦';
      case 'review_added':
        return '⭐';
      case 'payment_success':
        return '💳';
      case 'payment_failed':
        return '❌';
      case 'product_low_stock':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  if (!user) return null;

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button 
        className="bell-button" 
        onClick={toggleDropdown}
        title="Thông báo"
      >
        <i className="fa fa-bell"></i>
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
        {isConnected && <span className="status-dot"></span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Thông báo</h3>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="clear-all">
                Xóa tất cả
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <i className="fa fa-bell-slash"></i>
                <p>Không có thông báo mới</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="time">{formatTime(notification.timestamp)}</span>
                  </div>
                  <button 
                    className="close-btn"
                    onClick={() => clearNotification(notification.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
