const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

/**
 * DynamoDB Client Configuration
 * AWS SDK v3 for Node.js 20.x
 * Modular and built-in to Lambda runtime
 */

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const dynamodb = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true
    }
});

const TABLE_NAME = process.env.TABLE_NAME || 'BookStore';

/**
 * Helper function to put item
 */
async function putItem(item) {
    const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: item
    });
    return await dynamodb.send(command);
}

/**
 * Helper function to get item
 */
async function getItem(key) {
    const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: key
    });
    const result = await dynamodb.send(command);
    return result.Item;
}

/**
 * Helper function to update item
 */
async function updateItem(params) {
    const command = new UpdateCommand({
        TableName: TABLE_NAME,
        ...params
    });
    return await dynamodb.send(command);
}

/**
 * Helper function to delete item
 */
async function deleteItem(key) {
    const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: key
    });
    return await dynamodb.send(command);
}

/**
 * Helper function to query items
 */
async function queryItems(params) {
    const command = new QueryCommand({
        TableName: TABLE_NAME,
        ...params
    });
    return await dynamodb.send(command);
}

module.exports = {
    dynamodb,
    client,
    TABLE_NAME,
    putItem,
    getItem,
    updateItem,
    deleteItem,
    queryItems
};
