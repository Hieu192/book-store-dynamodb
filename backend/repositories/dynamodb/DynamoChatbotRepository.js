const { dynamodb, TABLE_NAME } = require('../../config/dynamodb');

/**
 * DynamoDB Chatbot Repository
 * Handles conversation and message operations using Single-Table Design
 * 
 * Table Structure:
 * - CONVERSATION#<id> + METADATA: Conversation metadata
 * - CONVERSATION#<id> + MESSAGE#<timestamp>#<id>: Individual messages
 * - GSI1: USER#<userId> -> CONVERSATION#<timestamp>#<id> (user's conversations)
 */
class DynamoChatbotRepository {
    constructor() {
        this.dynamodb = dynamodb;
        this.tableName = TABLE_NAME;
    }

    /**
     * Get conversation metadata
     */
    async getConversationMetadata(conversationId) {
        const params = {
            TableName: this.tableName,
            Key: {
                PK: `CONVERSATION#${conversationId}`,
                SK: 'METADATA'
            }
        };

        const result = await this.dynamodb.get(params).promise();
        return result.Item ? this._transformConversationFromDynamo(result.Item) : null;
    }

    /**
     * Get all messages from a conversation
     */
    async getConversationMessages(conversationId) {
        const params = {
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `CONVERSATION#${conversationId}`,
                ':sk': 'MESSAGE#'
            },
            ScanIndexForward: true // Oldest messages first (chronological order)
        };

        const result = await this.dynamodb.query(params).promise();
        return (result.Items || []).map(item => this._transformMessageFromDynamo(item));
    }

    /**
     * Get all conversations for a user
     */
    async getUserConversations(userId) {
        const params = {
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: {
                ':pk': `USER#${userId}`
            },
            ScanIndexForward: false // Newest conversations first
        };

        const result = await this.dynamodb.query(params).promise();
        return (result.Items || []).map(item => this._transformConversationFromDynamo(item));
    }

    /**
     * Verify conversation ownership
     */
    async verifyConversationOwnership(conversationId, userId) {
        const metadata = await this.getConversationMetadata(conversationId);
        return metadata && metadata.userId === userId;
    }

    /**
     * Transform conversation metadata from DynamoDB format
     */
    _transformConversationFromDynamo(item) {
        if (!item) return null;

        return {
            conversationId: item.conversationId,
            userId: item.userId,
            title: item.title,
            createdAt: item.createdAt,
            lastMessageAt: item.lastMessageAt,
            messageCount: item.messageCount || 0
        };
    }

    /**
     * Transform message from DynamoDB format
     */
    _transformMessageFromDynamo(item) {
        if (!item) return null;

        return {
            messageId: item.messageId,
            conversationId: item.conversationId,
            sender: item.sender,
            content: item.content,
            timestamp: item.timestamp,
            metadata: item.metadata || {}
        };
    }

    /**
     * Delete conversation and all its messages
     */
    async deleteConversation(conversationId) {
        // First, get all messages
        const messages = await this.getConversationMessages(conversationId);

        // Delete all messages
        for (const message of messages) {
            const timestamp = message.timestamp;
            const messageId = message.messageId;

            await this.dynamodb.delete({
                TableName: this.tableName,
                Key: {
                    PK: `CONVERSATION#${conversationId}`,
                    SK: `MESSAGE#${timestamp}#${messageId}`
                }
            }).promise();
        }

        // Delete metadata
        await this.dynamodb.delete({
            TableName: this.tableName,
            Key: {
                PK: `CONVERSATION#${conversationId}`,
                SK: 'METADATA'
            }
        }).promise();

        return true;
    }
}

module.exports = DynamoChatbotRepository;
