/**
 * Script tạo DynamoDB Table với Single-Table Design
 * Chạy: node backend/scripts/create-dynamodb-table.js
 */

const AWS = require('aws-sdk');

// Cấu hình AWS (local hoặc cloud)
const dynamodb = new AWS.DynamoDB({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined, // Để undefined cho AWS cloud
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const TABLE_NAME = 'BookStore';

const tableSchema = {
  TableName: TABLE_NAME,
  BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
  
  // Primary Key
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },  // Partition key
    { AttributeName: 'SK', KeyType: 'RANGE' }  // Sort key
  ],
  
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
    { AttributeName: 'GSI1PK', AttributeType: 'S' },
    { AttributeName: 'GSI1SK', AttributeType: 'S' },
    { AttributeName: 'GSI2PK', AttributeType: 'S' },
    { AttributeName: 'GSI2SK', AttributeType: 'S' }
  ],
  
  // Global Secondary Indexes
  GlobalSecondaryIndexes: [
    {
      IndexName: 'GSI1',
      KeySchema: [
        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
        { AttributeName: 'GSI1SK', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    },
    {
      IndexName: 'GSI2',
      KeySchema: [
        { AttributeName: 'GSI2PK', KeyType: 'HASH' },
        { AttributeName: 'GSI2SK', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' }
    }
  ],
  
  // Enable Streams for real-time sync
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  },
  
  Tags: [
    { Key: 'Project', Value: 'BookStore' },
    { Key: 'Environment', Value: process.env.NODE_ENV || 'development' }
  ]
};

async function createTable() {
  try {
    console.log(`🚀 Creating DynamoDB table: ${TABLE_NAME}...`);
    
    // Check if table exists
    try {
      await dynamodb.describeTable({ TableName: TABLE_NAME }).promise();
      console.log(`⚠️  Table ${TABLE_NAME} already exists!`);
      return;
    } catch (err) {
      if (err.code !== 'ResourceNotFoundException') {
        throw err;
      }
    }
    
    // Create table
    const result = await dynamodb.createTable(tableSchema).promise();
    console.log(`✅ Table created successfully!`);
    console.log(`📊 Table ARN: ${result.TableDescription.TableArn}`);
    
    // Wait for table to be active
    console.log('⏳ Waiting for table to be active...');
    await dynamodb.waitFor('tableExists', { TableName: TABLE_NAME }).promise();
    console.log('✅ Table is now active!');
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

async function deleteTable() {
  try {
    console.log(`🗑️  Deleting table: ${TABLE_NAME}...`);
    await dynamodb.deleteTable({ TableName: TABLE_NAME }).promise();
    console.log('✅ Table deleted successfully!');
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log('⚠️  Table does not exist');
    } else {
      console.error('❌ Error deleting table:', error);
      throw error;
    }
  }
}

// CLI commands
const command = process.argv[2];

if (command === 'create') {
  createTable();
} else if (command === 'delete') {
  deleteTable();
} else if (command === 'recreate') {
  deleteTable().then(() => {
    setTimeout(() => createTable(), 2000);
  });
} else {
  console.log('Usage:');
  console.log('  node create-dynamodb-table.js create    - Create table');
  console.log('  node create-dynamodb-table.js delete    - Delete table');
  console.log('  node create-dynamodb-table.js recreate  - Delete and recreate table');
}

module.exports = { createTable, deleteTable };
