const { deleteItem } = require('../shared/dynamodb');
const { errorResponse, successResponse } = require('../shared/utils');

/**
 * WebSocket $disconnect Handler
 * 
 * Triggered when client disconnects from WebSocket
 * Cleans up connection record from DynamoDB
 * 
 * Environment Variables:
 * - TABLE_NAME: DynamoDB table name
 */

exports.handler = async (event) => {
    console.log('WebSocket $disconnect event:', JSON.stringify(event, null, 2));

    const connectionId = event.requestContext.connectionId;

    try {
        // Delete connection from DynamoDB
        await deleteItem({
            PK: `CONNECTION#${connectionId}`,
            SK: 'METADATA'
        });

        console.log(`✅ Connection ${connectionId} deleted`);

        // Note: Can also clean up any active conversations here
        // For now, conversations remain (can be resumed later)

        return successResponse(200);

    } catch (error) {
        console.error('❌ Disconnect error:', error);

        // Even if delete fails, connection is already closed
        // So return 200 anyway
        return successResponse(200);
    }
};
