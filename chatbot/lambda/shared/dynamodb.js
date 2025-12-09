const AWS = require('aws-sdk');

/**
 * DynamoDB Client Configuration
 * Shared across all Lambda functions
 */

const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    convertEmptyValues: true,
    removeUndefinedValues: true
});

const dynamodbClient = new AWS.DynamoDB({
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const TABLE_NAME = process.env.TABLE_NAME || 'BookStore';

/**
 * Helper function to put item
 */
async function putItem(item) {
    return await dynamodb.put({
        TableName: TABLE_NAME,
        Item: item
    }).promise();
}

/**
 * Helper function to get item
 */
async function getItem(key) {
    const result = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: key
    }).promise();

    return result.Item;
}

/**
 * Helper function to update item
 */
async function updateItem(params) {
    return await dynamodb.update({
        TableName: TABLE_NAME,
        ...params
    }).promise();
}

/**
 * Helper function to delete item
 */
async function deleteItem(key) {
    return await dynamodb.delete({
        TableName: TABLE_NAME,
        Key: key
    }).promise();
}

/**
 * Helper function to query items
 */
async function queryItems(params) {
    return await dynamodb.query({
        TableName: TABLE_NAME,
        ...params
    }).promise();
}

module.exports = {
    dynamodb,
    dynamodbClient,
    TABLE_NAME,
    putItem,
    getItem,
    updateItem,
    deleteItem,
    queryItems
};
