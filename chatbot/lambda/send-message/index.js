const { getItem, putItem, updateItem, queryItems } = require('dynamodb');
const { verifyToken } = require('auth');
const { queryKnowledgeBase, generateResponseWithTools } = require('bedrock');
const {
    sendToConnection,
    generateUUID,
    getCurrentTimestamp,
    getTTL,
    errorResponse,
    successResponse,
    sanitizeInput,
    parseJSON
} = require('utils');

/**
 * WebSocket $default Handler
 * 
 * Handles all WebSocket messages including:
 * - Authentication
 * - Chat messages
 * - Other custom message types
 * 
 * Environment Variables:
 * - TABLE_NAME: DynamoDB table name
 * - JWT_SECRET: JWT secret for token verification
 * - KNOWLEDGE_BASE_ID: Bedrock Knowledge Base ID
 * - APIGW_ENDPOINT: API Gateway WebSocket endpoint
 */

exports.handler = async (event) => {
    console.log('WebSocket $default event:', JSON.stringify(event, null, 2));

    const connectionId = event.requestContext.connectionId;
    const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;

    try {
        // Parse message body
        const body = parseJSON(event.body || '{}');
        const messageType = body.type;

        console.log(`Message type: ${messageType}`);

        // Route to appropriate handler
        switch (messageType) {
            case 'authenticate':
                return await handleAuthentication(connectionId, body, endpoint);

            case 'chat_message':
                return await handleChatMessage(connectionId, body, endpoint);

            case 'ping':
                return await handlePing(connectionId, endpoint);

            default:
                await sendToConnection(connectionId, {
                    type: 'error',
                    message: `Unknown message type: ${messageType}`
                }, endpoint);
                return successResponse(400);
        }

    } catch (error) {
        console.error('❌ Message handler error:', error);

        try {
            await sendToConnection(connectionId, {
                type: 'error',
                message: 'Internal server error',
                details: error.message
            }, endpoint);
        } catch (sendError) {
            console.error('Failed to send error message:', sendError);
        }

        return errorResponse(500, 'Internal server error', error.message);
    }
};

/**
 * Handle authentication message
 */
async function handleAuthentication(connectionId, body, endpoint) {
    const token = body.token;

    if (!token) {
        await sendToConnection(connectionId, {
            type: 'auth_error',
            message: 'No token provided'
        }, endpoint);
        return errorResponse(401, 'No token provided');
    }

    // Verify JWT token
    const authResult = verifyToken(token);

    if (!authResult.valid) {
        await sendToConnection(connectionId, {
            type: 'auth_error',
            message: authResult.error || 'Invalid token'
        }, endpoint);
        return errorResponse(401, 'Invalid token');
    }

    const userId = authResult.userId;
    const email = authResult.email;

    // Build update expression dynamically
    const updateParts = [
        '#status = :auth',
        'userId = :uid',
        '#token = :token',  // Store token for API calls
        'authenticatedAt = :authAt',
        '#ttl = :ttl'
    ];
    const expressionAttributeNames = {
        '#status': 'status',
        '#token': 'token',
        '#ttl': 'ttl'
    };
    const expressionAttributeValues = {
        ':auth': 'AUTHENTICATED',
        ':uid': userId,
        ':token': token,  // Store original JWT token
        ':authAt': getCurrentTimestamp(),
        ':ttl': getTTL(86400) // 24 hours
    };

    // Add email only if present
    if (email) {
        updateParts.push('email = :email');
        expressionAttributeValues[':email'] = email;
    }

    // Update connection to AUTHENTICATED
    await updateItem({
        Key: {
            PK: `CONNECTION#${connectionId}`,
            SK: 'METADATA'
        },
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    });

    console.log(`✅ Connection ${connectionId} authenticated for user ${userId}`);

    // Send success response
    await sendToConnection(connectionId, {
        type: 'auth_success',
        userId: userId,
        message: 'Successfully authenticated'
    }, endpoint);

    return successResponse(200);
}

/**
 * Handle chat message
 */
async function handleChatMessage(connectionId, body, endpoint) {
    // Get connection to verify authentication
    const connection = await getItem({
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA'
    });

    if (!connection) {
        await sendToConnection(connectionId, {
            type: 'error',
            message: 'Connection not found'
        }, endpoint);
        return errorResponse(404, 'Connection not found');
    }

    if (connection.status !== 'AUTHENTICATED') {
        await sendToConnection(connectionId, {
            type: 'error',
            message: 'Not authenticated. Please authenticate first.'
        }, endpoint);
        return errorResponse(401, 'Not authenticated');
    }

    const userId = connection.userId;
    const userMessage = sanitizeInput(body.message);
    const conversationId = body.conversationId || generateUUID();

    if (!userMessage || userMessage.trim().length === 0) {
        await sendToConnection(connectionId, {
            type: 'error',
            message: 'Message cannot be empty'
        }, endpoint);
        return errorResponse(400, 'Empty message');
    }

    console.log(`Processing message from user ${userId}: "${userMessage.substring(0, 50)}..."`);

    // Send typing indicator
    await sendToConnection(connectionId, {
        type: 'typing',
        conversationId: conversationId
    }, endpoint);

    // Store user message
    const userMessageId = generateUUID();
    const userTimestamp = getCurrentTimestamp();

    await putItem({
        PK: `CONVERSATION#${conversationId}`,
        SK: `MESSAGE#${userTimestamp}#${userMessageId}`,
        messageId: userMessageId,
        conversationId: conversationId,
        sender: 'user',
        content: userMessage,
        timestamp: userTimestamp,
        userId: userId
    });

    // Get recent conversation history (last 5 messages)
    const historyResult = await queryItems({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': `CONVERSATION#${conversationId}`,
            ':sk': 'MESSAGE#'
        },
        ScanIndexForward: false,  // Newest first
        Limit: 5
    });

    const conversationHistory = (historyResult.Items || [])
        .reverse()  // Oldest first for context
        .map(item => ({
            sender: item.sender,
            content: item.content
        }));

    // Query Knowledge Base
    let kbResults = [];
    try {
        kbResults = await queryKnowledgeBase(userMessage, 3);
        console.log(`Retrieved ${kbResults.length} results from Knowledge Base`);
    } catch (kbError) {
        console.error('Knowledge Base query failed:', kbError);
        // Continue without KB results
    }

    // Generate response with Claude + Function Calling
    let botResponseText;
    let sources = [];
    let toolsUsed = [];

    try {
        // Get auth token from connection for API calls
        const authToken = connection.token || null;
        console.log(`🔑 authToken available: ${!!authToken}, length: ${authToken?.length || 0}`);

        const response = await generateResponseWithTools(
            userMessage,
            conversationHistory,
            authToken  // Pass token for order API calls
        );

        botResponseText = response.text;
        sources = response.sources || [];
        toolsUsed = response.toolsUsed || [];

        console.log(`Generated response: "${botResponseText.substring(0, 50)}..."`);
        if (toolsUsed.length > 0) {
            console.log(`Tools used: ${toolsUsed.map(t => t.tool).join(', ')}`);
        }
    } catch (genError) {
        console.error('Response generation failed:', genError);
        botResponseText = 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.';
    }

    // Store bot message
    const botMessageId = generateUUID();
    const botTimestamp = getCurrentTimestamp();

    await putItem({
        PK: `CONVERSATION#${conversationId}`,
        SK: `MESSAGE#${botTimestamp}#${botMessageId}`,
        messageId: botMessageId,
        conversationId: conversationId,
        sender: 'bot',
        content: botResponseText,
        timestamp: botTimestamp,
        metadata: {
            sources: sources,
            model: 'claude-3-haiku',
            kbResultsCount: kbResults.length
        }
    });

    // Update or create conversation metadata
    await putItem({
        PK: `CONVERSATION#${conversationId}`,
        SK: 'METADATA',
        conversationId: conversationId,
        userId: userId,
        title: userMessage.substring(0, 100), // First message as title
        lastMessageAt: botTimestamp,
        createdAt: userTimestamp,
        messageCount: (conversationHistory.length + 2), // Approximate
        GSI1PK: `USER#${userId}`,
        GSI1SK: `CONVERSATION#${userTimestamp}#${conversationId}`
    });

    // Send bot response to client
    await sendToConnection(connectionId, {
        type: 'chat_response',
        conversationId: conversationId,
        message: {
            id: botMessageId,
            content: botResponseText,
            timestamp: botTimestamp,
            sender: 'bot',
            sources: sources
        }
    }, endpoint);

    console.log(`✅ Message processed successfully for conversation ${conversationId}`);

    return successResponse(200);
}

/**
 * Handle ping message (keep-alive)
 */
async function handlePing(connectionId, endpoint) {
    await sendToConnection(connectionId, {
        type: 'pong',
        timestamp: getCurrentTimestamp()
    }, endpoint);

    return successResponse(200);
}
