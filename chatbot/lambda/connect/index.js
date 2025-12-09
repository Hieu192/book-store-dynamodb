const { putItem } = require('../shared/dynamodb');
const { getCurrentTimestamp, getTTL, errorResponse, successResponse } = require('../shared/utils');

/**
 * WebSocket $connect Handler
 * 
 * Triggered when client connects to WebSocket
 * Performs minimal validation and stores connection as PENDING_AUTH
 * 
 * Environment Variables:
 * - TABLE_NAME: DynamoDB table name
 */

exports.handler = async (event) => {
    console.log('WebSocket $connect event:', JSON.stringify(event, null, 2));

    const connectionId = event.requestContext.connectionId;
    const sourceIp = event.requestContext.identity.sourceIp;

    try {
        // Optional: Basic validation from query string
        const temp = event.queryStringParameters?.temp;

        if (!temp) {
            console.warn('No temp parameter provided');
            // Still allow connection, will require auth later
        }

        // Store connection as PENDING_AUTH
        // User must send authenticate message to upgrade to AUTHENTICATED
        await putItem({
            PK: `CONNECTION#${connectionId}`,
            SK: 'METADATA',
            connectionId: connectionId,
            status: 'PENDING_AUTH',
            sourceIp: sourceIp,
            connectedAt: getCurrentTimestamp(),
            ttl: getTTL(300) // 5 minutes to authenticate, then auto-delete
        });

        console.log(`✅ Connection ${connectionId} stored as PENDING_AUTH`);
        console.log(`Source IP: ${sourceIp}`);

        return successResponse(200);

    } catch (error) {
        console.error('❌ Connect error:', error);

        // Return 500 to reject connection
        return errorResponse(500, 'Failed to establish connection', {
            connectionId: connectionId,
            error: error.message
        });
    }
};
