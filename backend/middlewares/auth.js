const userService = require('../services/UserService');
const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");

// Checks if user is authenticated or not
exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
    // Try to get token from cookies first (for browser requests)
    let token = req.cookies.token;

    // If no token in cookies, try Authorization header (for API requests)
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    if (!token) {
        return next(new ErrorHandler('Login first to access this resource.', 401));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await userService.getUser(decoded.id);
        next();
    } catch (error) {
        // ✅ BUSINESS RULE: Preserve TokenExpiredError for proper client-side handling
        // This allows the frontend to distinguish between expired tokens (can refresh) 
        // and invalid tokens (must re-login)
        if (error.name === 'TokenExpiredError') {
            return next(error); // Keep original error for client to handle token refresh
        }
        return next(new ErrorHandler('Invalid or expired token', 401));
    }
});

// Handling users roles
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorHandler(`Role (${req.user.role}) is not allowed to acccess this resource`, 403))
        }
        next()
    }
}