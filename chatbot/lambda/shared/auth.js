const jwt = require('jsonwebtoken');

// Get JWT_SECRET from environment
let JWT_SECRET = process.env.JWT_SECRET;

// Handle case where secret is stored as JSON object in Secrets Manager
// e.g., {"bookstore/dev/jwt-secret":"ACTUAL_SECRET"}
if (JWT_SECRET && JWT_SECRET.startsWith('{')) {
    try {
        const parsed = JSON.parse(JWT_SECRET);
        // Extract the actual secret value (first value in object)
        JWT_SECRET = Object.values(parsed)[0];
    } catch (e) {
        // If parse fails, use as-is
    }
}

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Verify JWT token
 * Uses same JWT_SECRET as backend for consistency
 * 
 * @param {string} token - JWT token from client
 * @returns {Object} { valid: boolean, userId?: string, email?: string, error?: string }
 */
function verifyToken(token) {
    try {
        if (!token || typeof token !== 'string') {
            return { valid: false, error: 'Invalid token format' };
        }

        // Verify and decode token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Validate decoded payload
        if (!decoded.id) {
            return { valid: false, error: 'Invalid token payload' };
        }

        return {
            valid: true,
            userId: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
    } catch (error) {
        console.error('Token verification error:', error.message);

        if (error.name === 'TokenExpiredError') {
            return { valid: false, error: 'Token expired' };
        } else if (error.name === 'JsonWebTokenError') {
            return { valid: false, error: 'Invalid token' };
        }

        return { valid: false, error: error.message };
    }
}

/**
 * Extract token from various sources
 * 
 * @param {Object} event - Lambda event object
 * @returns {string|null} token
 */
function extractToken(event) {
    // From body (for authenticate message)
    if (event.body) {
        try {
            const body = JSON.parse(event.body);
            if (body.token) {
                return body.token;
            }
        } catch (e) {
            // Not JSON or no token in body
        }
    }

    // From query string
    if (event.queryStringParameters?.token) {
        return event.queryStringParameters.token;
    }

    // From headers
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

module.exports = {
    verifyToken,
    extractToken
};
