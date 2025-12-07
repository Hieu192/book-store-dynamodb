/**
 * Migration Script: Add GSI3 for OrderCode Lookup
 * 
 * Purpose: Add Global Secondary Index for efficient orderCode queries
 * Before: SCAN entire table (slow, expensive)
 * After: Query GSI3 (fast, cheap)
 * 
 * IMPORTANT: Run this script BEFORE deploying new code
 * 
 * Usage:
 *   node scripts/add-gsi3-ordercode.js
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'BookStore';

async function addGSI3() {
    console.log('🚀 Starting GSI3 migration for orderCode lookup...\n');

    try {
        // Step 1: Check if GSI3 already exists
        console.log('📋 Step 1: Checking existing table structure...');
        const tableInfo = await dynamodb.describeTable({ TableName: TABLE_NAME }).promise();

        const existingGSIs = tableInfo.Table.GlobalSecondaryIndexes || [];
        const gsi3Exists = existingGSIs.some(gsi => gsi.IndexName === 'GSI3');

        if (gsi3Exists) {
            console.log('✅ GSI3 already exists. Skipping creation.\n');
            return;
        }

        // Step 2: Add GSI3 to table
        console.log('📝 Step 2: Adding GSI3 to DynamoDB table...');

        const params = {
            TableName: TABLE_NAME,
            AttributeDefinitions: [
                { AttributeName: 'GSI3PK', AttributeType: 'S' },
                { AttributeName: 'GSI3SK', AttributeType: 'S' }
            ],
            GlobalSecondaryIndexUpdates: [
                {
                    Create: {
                        IndexName: 'GSI3',
                        KeySchema: [
                            { AttributeName: 'GSI3PK', KeyType: 'HASH' },
                            { AttributeName: 'GSI3SK', KeyType: 'RANGE' }
                        ],
                        Projection: {
                            ProjectionType: 'ALL'
                        },
                        ProvisionedThroughput: {
                            ReadCapacityUnits: 5,
                            WriteCapacityUnits: 5
                        }
                    }
                }
            ]
        };

        await dynamodb.updateTable(params).promise();
        console.log('✅ GSI3 creation initiated!\n');

        // Step 3: Wait for GSI to become ACTIVE
        console.log('⏳ Step 3: Waiting for GSI3 to become ACTIVE...');
        console.log('   (This may take 5-10 minutes for large tables)\n');

        await waitForGSIActive();

        console.log('✅ GSI3 is now ACTIVE!\n');

        // Step 4: Backfill existing orders with GSI3 keys
        console.log('📦 Step 4: Backfilling existing orders with GSI3 keys...');
        await backfillOrdersWithGSI3();

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📊 Next steps:');
        console.log('   1. Deploy new backend code');
        console.log('   2. Test payment webhook performance');
        console.log('   3. Monitor GSI3 usage in CloudWatch\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

async function waitForGSIActive() {
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 10 seconds = 10 minutes

    while (attempts < maxAttempts) {
        const tableInfo = await dynamodb.describeTable({ TableName: TABLE_NAME }).promise();
        const gsi3 = tableInfo.Table.GlobalSecondaryIndexes?.find(gsi => gsi.IndexName === 'GSI3');

        if (gsi3 && gsi3.IndexStatus === 'ACTIVE') {
            return;
        }

        attempts++;
        process.stdout.write(`   Attempt ${attempts}/${maxAttempts}: ${gsi3?.IndexStatus || 'CREATING'}...\r`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }

    throw new Error('Timeout waiting for GSI3 to become ACTIVE');
}

async function backfillOrdersWithGSI3() {
    let processedCount = 0;
    let errorCount = 0;
    let lastEvaluatedKey = null;

    do {
        // Scan orders
        const scanParams = {
            TableName: TABLE_NAME,
            FilterExpression: 'EntityType = :type',
            ExpressionAttributeValues: {
                ':type': 'Order'
            },
            ExclusiveStartKey: lastEvaluatedKey
        };

        const result = await docClient.scan(scanParams).promise();

        // Update each order with GSI3 keys
        for (const item of result.Items) {
            try {
                if (!item.orderCode) {
                    console.log(`   ⚠️  Skipping order ${item.orderId} - missing orderCode`);
                    continue;
                }

                const updateParams = {
                    TableName: TABLE_NAME,
                    Key: {
                        PK: item.PK,
                        SK: item.SK
                    },
                    UpdateExpression: 'SET GSI3PK = :gsi3pk, GSI3SK = :gsi3sk',
                    ExpressionAttributeValues: {
                        ':gsi3pk': `ORDERCODE#${item.orderCode}`,
                        ':gsi3sk': 'METADATA'
                    }
                };

                await docClient.update(updateParams).promise();
                processedCount++;

                if (processedCount % 10 === 0) {
                    process.stdout.write(`   Processed ${processedCount} orders...\r`);
                }
            } catch (error) {
                console.error(`   ❌ Error updating order ${item.orderId}:`, error.message);
                errorCount++;
            }
        }

        lastEvaluatedKey = result.LastEvaluatedKey;

    } while (lastEvaluatedKey);

    console.log(`\n   ✅ Backfill completed: ${processedCount} orders updated`);
    if (errorCount > 0) {
        console.log(`   ⚠️  ${errorCount} orders failed to update`);
    }
}

// Run migration
addGSI3();
