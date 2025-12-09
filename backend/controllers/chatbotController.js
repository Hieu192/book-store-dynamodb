/**
 * Chatbot Token Controller
 * Returns current user's JWT token for chatbot authentication
 */

const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Get chatbot token for authenticated user
 * @route GET /api/v1/chatbot/token
 * @access Private (authenticated users only)
 */
exports.getChatbotToken = catchAsyncErrors(async (req, res, next) => {
    // User is already authenticated via JWT middleware
    if (!req.user) {
        return next(new ErrorHandler('Not authenticated', 401));
    }

    // Get token from cookie
    const token = req.cookies.token;

    if (!token) {
        return next(new ErrorHandler('No token found', 401));
    }

    res.status(200).json({
        success: true,
        token: token,
        userId: req.user.id,
        email: req.user.email
    });
});
