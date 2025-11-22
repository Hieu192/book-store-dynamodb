/**
 * Application Configuration
 * Centralized configuration for all environment variables
 */

const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api/v1',
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000',
  
  // WebSocket Configuration
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:4000/ws',
  
  // Cloudinary Configuration
  CLOUDINARY_BASE_URL: process.env.REACT_APP_CLOUDINARY_BASE_URL || 
    'https://res.cloudinary.com/hba-solver/image/upload',
  
  // Payment Configuration
  PAYMENT_API_URL: process.env.REACT_APP_PAYMENT_API_URL || 
    'http://localhost:4000/api/v1',
  
  // Contact Form
  CONTACT_FORM_URL: process.env.REACT_APP_CONTACT_FORM_URL || 
    'https://formsubmit.co/hy106625@gmail.com',
  
  // App Configuration
  ENV: process.env.REACT_APP_ENV || 'development',
  DEBUG: process.env.REACT_APP_DEBUG === 'true',
  
  // Feature Flags
  ENABLE_WEBSOCKET: process.env.REACT_APP_ENABLE_WEBSOCKET !== 'false',
  ENABLE_NOTIFICATIONS: process.env.REACT_APP_ENABLE_NOTIFICATIONS !== 'false',
  
  // Helper methods
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isTest: () => process.env.NODE_ENV === 'test',
  
  // Get full API endpoint
  getApiUrl: (endpoint) => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api/v1';
    return endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
  },
  
  // Get WebSocket URL (auto-detect protocol if needed)
  getWsUrl: () => {
    if (process.env.REACT_APP_WS_URL) {
      return process.env.REACT_APP_WS_URL;
    }
    
    // Auto-detect based on current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'production' ? '' : ':4000';
    return `${protocol}//${host}${port}/ws`;
  },
  
  // Get Cloudinary image URL
  getCloudinaryUrl: (path) => {
    const baseUrl = process.env.REACT_APP_CLOUDINARY_BASE_URL || 
      'https://res.cloudinary.com/hba-solver/image/upload';
    return `${baseUrl}/${path}`;
  },
  
  // Log configuration (only in development)
  logConfig: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 App Configuration:', {
        ENV: config.ENV,
        API_URL: config.API_URL,
        WS_URL: config.WS_URL,
        DEBUG: config.DEBUG,
      });
    }
  }
};

// Log config on load (development only)
config.logConfig();

export default config;
