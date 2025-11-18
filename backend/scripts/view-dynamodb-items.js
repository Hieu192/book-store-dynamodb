/**
 * View DynamoDB Items
 * Xem sample items trong DynamoDB table
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/config.env') });
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function viewItems() {
  try {
    console.log('📊 Viewing items in BookStore table...\n');
    
    // Scan table to get sample items
    const result = await dynamodb.scan({
      TableName: 'BookStore',
      Limit: 10
    }).promise();

    console.log(`Found ${result.Items.length} items:\n`);
    
    result.Items.forEach((item, index) => {
      console.log(`${index + 1}. ─────────────────────────────────────`);
      console.log(`   PK:         ${item.PK}`);
      console.log(`   SK:         ${item.SK}`);
      console.log(`   EntityType: ${item.EntityType}`);
      console.log(`   Name:       ${item.name || 'N/A'}`);
      console.log(`   Category:   ${item.category || 'N/A'}`);
      console.log(`   Price:      ${item.price || 'N/A'}`);
      console.log('');
    });

    // Count by entity type
    console.log('\n📈 Count by Entity Type:');
    const products = result.Items.filter(i => i.EntityType === 'Product').length;
    const reviews = result.Items.filter(i => i.EntityType === 'Review').length;
    const users = result.Items.filter(i => i.EntityType === 'User').length;
    const orders = result.Items.filter(i => i.EntityType === 'Order').length;
    
    console.log(`   Products: ${products}`);
    console.log(`   Reviews:  ${reviews}`);
    console.log(`   Users:    ${users}`);
    console.log(`   Orders:   ${orders}`);

    // Total count
    const countResult = await dynamodb.scan({
      TableName: 'BookStore',
      Select: 'COUNT'
    }).promise();
    
    console.log(`\n📊 Total items in table: ${countResult.Count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

viewItems();
