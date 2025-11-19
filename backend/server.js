const app = require('./app')
const connectDatabase = require('./config/database')
const { connectRedis, disconnectRedis } = require('./config/redis')
const { initWebSocket, closeWebSocket } = require('./config/websocket')

// Handle Uncaught exceptions
process.on('uncaughtException', err => {
    console.log(`ERROR: ${err.stack}`);
    console.log('Shutting down due to uncaught exception');
    process.exit(1)
})

// Setting up config file
if (process.env.NODE_ENV !== 'PRODUCTION') require('dotenv').config({ path: 'backend/config/config.env' })

// Connecting to database
connectDatabase()

// Connecting to Redis (optional - will continue without it if connection fails)
connectRedis().catch(err => {
    console.log('⚠️  Starting server without Redis cache');
});

// Note: Image uploads now use AWS S3 instead of Cloudinary
// S3 configuration is handled in utils/s3Upload.js

const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on PORT: ${process.env.PORT} in ${process.env.NODE_ENV} mode.`)
})

// Initialize WebSocket server for real-time notifications
initWebSocket(server);

// Handle Unhandled Promise rejections
process.on('unhandledRejection', err => {
    console.log(`ERROR: ${err.stack}`);
    console.log('Shutting down the server due to Unhandled Promise rejection');
    server.close(async () => {
        closeWebSocket();
        await disconnectRedis();
        process.exit(1)
    })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(async () => {
        closeWebSocket();
        await disconnectRedis();
        console.log('Process terminated');
    });
});