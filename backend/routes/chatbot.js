const express = require('express');
const router = express.Router();

const {
    getChatbotToken,
    getConversationHistory,
    getUserConversations,
    deleteConversation
} = require('../controllers/chatbotController');

const { isAuthenticatedUser } = require('../middlewares/auth');

// Get chatbot authentication token
router.route('/chatbot/token').get(isAuthenticatedUser, getChatbotToken);

// Get all conversations for current user
router.route('/chatbot/conversations').get(isAuthenticatedUser, getUserConversations);

// Get or delete specific conversation
router.route('/chatbot/conversation/:conversationId')
    .get(isAuthenticatedUser, getConversationHistory)
    .delete(isAuthenticatedUser, deleteConversation);

// NOTE: Order management uses existing order controller endpoints:
// - GET /api/v1/orders/me - Get all user orders (from orderController.myOrders)
// - GET /api/v1/order/:id - Get single order (from orderController.getSingleOrder)
// Lambda will call these endpoints directly for order queries

module.exports = router;
