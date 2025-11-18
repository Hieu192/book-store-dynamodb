const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient({
  convertEmptyValues: true,
  removeUndefinedValues: true
});

const dynamodbClient = new AWS.DynamoDB();

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'BookStore';

module.exports = {
  dynamodb,
  dynamodbClient,
  TABLE_NAME
};
