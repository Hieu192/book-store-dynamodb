/**
 * Script to update all existing products in DynamoDB with normalized names
 * Run this once to add nameNormalized field to existing products
 */

const AWS = require('aws-sdk');

// Load environment variables
if (process.env.NODE_ENV !== 'PRODUCTION') {
    require('dotenv').config({ path: 'backend/config/config.env' });
}

// Configure DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    convertEmptyValues: true
});

const tableName = 'BookStore';

// Helper function to remove Vietnamese accents
function removeVietnameseAccents(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

async function scanAllProducts() {
    console.log('🔍 Scanning all products from DynamoDB...');
    
    let items = [];
    let lastEvaluatedKey = null;

    do {
        const params = {
            TableName: tableName,
            FilterExpression: 'EntityType = :type',
            ExpressionAttributeValues: {
                ':type': 'Product'
            }
        };

        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        const result = await dynamodb.scan(params).promise();
        items = items.concat(result.Items);
        lastEvaluatedKey = result.LastEvaluatedKey;

        console.log(`   Found ${items.length} products so far...`);

    } while (lastEvaluatedKey);

    return items;
}

async function updateProduct(product) {
    const nameNormalized = removeVietnameseAccents(product.name.toLowerCase());
    
    const params = {
        TableName: tableName,
        Key: {
            PK: product.PK,
            SK: product.SK
        },
        UpdateExpression: 'SET nameNormalized = :nameNormalized, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
            ':nameNormalized': nameNormalized,
            ':updatedAt': new Date().toISOString()
        }
    };

    await dynamodb.update(params).promise();
}

async function updateAllProducts() {
    try {
        console.log('🚀 Starting DynamoDB product update...\n');
        
        const products = await scanAllProducts();
        console.log(`\n📦 Found ${products.length} products to update\n`);
        
        if (products.length === 0) {
            console.log('⚠️  No products found in DynamoDB');
            return;
        }

        let updated = 0;
        let errors = 0;

        for (const product of products) {
            try {
                await updateProduct(product);
                updated++;
                
                if (updated % 10 === 0) {
                    console.log(`   ✅ Updated ${updated}/${products.length} products...`);
                }
            } catch (error) {
                errors++;
                console.error(`   ❌ Error updating product ${product.productId}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Successfully updated: ${updated} products`);
        if (errors > 0) {
            console.log(`❌ Failed to update: ${errors} products`);
        }
        console.log('🎉 Done!');
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the update
updateAllProducts()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
