const AWS = require('aws-sdk');

/**
 * Utility Helper Functions
 */

/**
 * Send message to WebSocket connection
 * 
 * @param {string} connectionId - WebSocket connection ID
 * @param {Object} data - Data to send
 * @param {string} endpoint - API Gateway endpoint
 */
async function sendToConnection(connectionId, data, endpoint) {
    const apiGateway = new AWS.ApiGatewayManagementApi({
        endpoint: endpoint || process.env.APIGW_ENDPOINT
    });

    try {
        await apiGateway.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify(data)
        }).promise();

        console.log(`Message sent to connection ${connectionId}`);
        return true;
    } catch (error) {
        if (error.statusCode === 410) {
            console.log(`Connection ${connectionId} is gone (stale)`);
            // Connection is stale, should be cleaned up
            return false;
        }
        console.error(`Error sending to connection ${connectionId}:`, error);
        throw error;
    }
}

/**
 * Generate UUID v4
 * Simple implementation without external package
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get current timestamp in ISO format
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Get TTL timestamp (seconds since epoch)
 * 
 * @param {number} expirySeconds - Expiry time in seconds from now
 */
function getTTL(expirySeconds) {
    return Math.floor(Date.now() / 1000) + expirySeconds;
}

/**
 * Format error response
 */
function errorResponse(statusCode, message, details = null) {
    const response = {
        statusCode: statusCode,
        body: JSON.stringify({
            error: message,
            ...(details && { details })
        })
    };

    console.error(`Error ${statusCode}:`, message, details);
    return response;
}

/**
 * Format success response
 */
function successResponse(statusCode = 200, data = null) {
    return {
        statusCode: statusCode,
        body: data ? JSON.stringify(data) : 'OK'
    };
}

/**
 * Sanitize user input to prevent injection
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }

    // Remove potentially dangerous characters
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .trim()
        .substring(0, 5000); // Max 5000 chars
}

/**
 * Validate conversation ID format
 */
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Parse JSON safely
 */
function parseJSON(jsonString, defaultValue = {}) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON parse error:', error.message);
        return defaultValue;
    }
}

/**
 * Sleep/delay function
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, i);
            console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
            await sleep(delay);
        }
    }
}

module.exports = {
    sendToConnection,
    generateUUID,
    getCurrentTimestamp,
    getTTL,
    errorResponse,
    successResponse,
    sanitizeInput,
    isValidUUID,
    parseJSON,
    sleep,
    retryWithBackoff
};
