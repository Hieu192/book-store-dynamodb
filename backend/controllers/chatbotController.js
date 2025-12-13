/**
 * Chatbot Controller
 * Handles chatbot-related operations using Repository Pattern
 * 
 * NOTE: Order queries use existing order controller endpoints
 * - No duplicate endpoints needed
 */

const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const repositoryFactory = require('../repositories/RepositoryFactory');

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

/**
 * Get conversation history
 * @route GET /api/v1/chatbot/conversation/:conversationId
 * @access Private (authenticated users only)
 */
exports.getConversationHistory = catchAsyncErrors(async (req, res, next) => {
    if (!req.user) {
        return next(new ErrorHandler('Not authenticated', 401));
    }

    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!conversationId) {
        return next(new ErrorHandler('Conversation ID is required', 400));
    }

    try {
        const chatbotRepo = repositoryFactory.getChatbotRepository();

        // Step 1: Get conversation metadata to verify ownership
        console.log('📋 Fetching conversation metadata for:', conversationId);
        const metadata = await chatbotRepo.getConversationMetadata(conversationId);

        if (!metadata) {
            return next(new ErrorHandler('Conversation not found', 404));
        }

        // Step 2: Verify that this conversation belongs to the current user
        if (metadata.userId !== userId) {
            return next(new ErrorHandler('Unauthorized: This conversation does not belong to you', 403));
        }

        // Step 3: Get all messages from this conversation
        console.log('💬 Fetching conversation messages...');
        const messages = await chatbotRepo.getConversationMessages(conversationId);

        console.log(`✅ Retrieved ${messages.length} messages from conversation ${conversationId}`);

        res.status(200).json({
            success: true,
            conversationId,
            metadata: {
                title: metadata.title,
                createdAt: metadata.createdAt,
                lastMessageAt: metadata.lastMessageAt,
                messageCount: metadata.messageCount
            },
            messages: messages,
            count: messages.length
        });

    } catch (error) {
        console.error('❌ Get conversation history error:', error);
        return next(new ErrorHandler(`Failed to retrieve conversation history: ${error.message}`, 500));
    }
});

/**
 * Get all conversations for current user
 * @route GET /api/v1/chatbot/conversations
 * @access Private (authenticated users only)
 */
exports.getUserConversations = catchAsyncErrors(async (req, res, next) => {
    if (!req.user) {
        return next(new ErrorHandler('Not authenticated', 401));
    }

    const userId = req.user.id;

    try {
        const chatbotRepo = repositoryFactory.getChatbotRepository();

        console.log('📚 Fetching all conversations for user:', userId);
        const conversations = await chatbotRepo.getUserConversations(userId);

        console.log(`✅ Found ${conversations.length} conversations for user ${userId}`);

        res.status(200).json({
            success: true,
            conversations: conversations,
            count: conversations.length
        });

    } catch (error) {
        console.error('❌ Get user conversations error:', error);
        return next(new ErrorHandler(`Failed to retrieve conversations: ${error.message}`, 500));
    }
});

/**
 * Delete conversation
 * @route DELETE /api/v1/chatbot/conversation/:conversationId
 * @access Private (authenticated users only)
 */
exports.deleteConversation = catchAsyncErrors(async (req, res, next) => {
    if (!req.user) {
        return next(new ErrorHandler('Not authenticated', 401));
    }

    const { conversationId } = req.params;
    const userId = req.user.id;

    if (!conversationId) {
        return next(new ErrorHandler('Conversation ID is required', 400));
    }

    try {
        const chatbotRepo = repositoryFactory.getChatbotRepository();

        // Verify ownership
        const isOwner = await chatbotRepo.verifyConversationOwnership(conversationId, userId);

        if (!isOwner) {
            return next(new ErrorHandler('Unauthorized: This conversation does not belong to you', 403));
        }

        // Delete conversation and all messages
        await chatbotRepo.deleteConversation(conversationId);

        console.log(`✅ Deleted conversation ${conversationId} for user ${userId}`);

        res.status(200).json({
            success: true,
            message: 'Conversation deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete conversation error:', error);
        return next(new ErrorHandler(`Failed to delete conversation: ${error.message}`, 500));
    }
});
