/**
 * Seed Mock Orders to DynamoDB for Testing Recommendations
 * Creates 100 orders with realistic patterns
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const path = require('path');

// Load config
dotenv.config({ path: path.join(__dirname, '../config/config.env') });

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'BookStore';

// Helper functions
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = () => {
  const now = new Date();
  const daysAgo = randomInt(0, 90);
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
};

// Product combinations that are frequently bought together
const productCombos = [
  // Will be populated with actual product IDs from DynamoDB
];

const orderStatuses = ['Processing', 'Shipped', 'Delivered'];
const paymentStatuses = ['succeeded', 'succeeded', 'succeeded', 'pending'];

async function getAllProducts() {
  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :type',
      ExpressionAttributeValues: {
        ':type': 'Product'
      }
    };
    
    const response = await docClient.scan(params).promise();
    return response.Items || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function seedOrders() {
  try {
    console.log('🌱 Starting DynamoDB order seeding...\n');

    // Get all products
    const products = await getAllProducts();
    
    if (products.length === 0) {
      console.log('❌ No products found in DynamoDB. Please seed products first.');
      process.exit(1);
    }

    console.log(`📦 Found ${products.length} products in DynamoDB\n`);

    // Create product combos from actual product IDs
    if (products.length >= 4) {
      const getId = (p) => p.productId || p.id;
      productCombos.push(
        [getId(products[0]), getId(products[1])],
        [getId(products[1]), getId(products[2])],
        [getId(products[0]), getId(products[3])],
        [getId(products[0]), getId(products[1]), getId(products[2])]
      );
    }

    // Mock user IDs (you can replace with actual user IDs from your system)
    const mockUserIds = [
      '662cf6576d0ebc4848384118',
      '662cf6576d0ebc4848384119',
      '662cf6576d0ebc484838411a',
      '662cf6576d0ebc484838411b'
    ];

    const orders = [];
    const productMap = {};
    products.forEach(p => {
      const pid = p.productId || p.id;
      productMap[pid] = p;
    });

    console.log('📝 Creating 100 orders...\n');

    // Create 100 orders
    for (let i = 0; i < 100; i++) {
      const userId = randomElement(mockUserIds);
      const createdAt = randomDate();
      const orderId = uuidv4();
      
      // Decide order type: 60% combo, 40% random
      let orderItems = [];
      
      if (Math.random() < 0.6 && productCombos.length > 0) {
        // Use predefined combo
        const combo = randomElement(productCombos);
        orderItems = combo.map(productId => {
          const product = productMap[productId];
          if (!product) return null;
          
          const quantity = randomInt(1, 3);
          return {
            name: product.name,
            quantity: quantity,
            image: product.images && product.images[0] ? product.images[0].path : 'https://via.placeholder.com/150',
            price: product.price,
            product: product.productId || product.id
          };
        }).filter(item => item !== null);
      } else {
        // Random products (1-4 items)
        const numItems = randomInt(1, 4);
        const selectedProducts = [];
        
        for (let j = 0; j < numItems; j++) {
          const product = randomElement(products);
          if (!selectedProducts.find(p => p.id === product.id)) {
            selectedProducts.push(product);
          }
        }
        
        orderItems = selectedProducts.map(product => ({
          name: product.name,
          quantity: randomInt(1, 3),
          image: product.images && product.images[0] ? product.images[0].path : 'https://via.placeholder.com/150',
          price: product.price,
          product: product.productId || product.id
        }));
      }

      // Calculate totals
      const itemsPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const taxPrice = Math.round(itemsPrice * 0.1);
      const shippingPrice = itemsPrice > 200000 ? 0 : 30000;
      const totalPrice = itemsPrice + taxPrice + shippingPrice;

      const orderStatus = randomElement(orderStatuses);
      
      const order = {
        // Single-Table Design Keys
        PK: `ORDER#${orderId}`,
        SK: 'METADATA',
        GSI1PK: `USER#${userId}`,
        GSI1SK: `ORDER#${createdAt}`,
        GSI2PK: `STATUS#${orderStatus}`,
        GSI2SK: `CREATED#${createdAt}`,
        
        // Entity Type
        EntityType: 'Order',
        
        // Order Data
        orderId: orderId,
        userId: userId,
        orderCode: Date.now() + i,
        shippingInfo: {
          address: `${randomInt(1, 999)} Đường ${randomInt(1, 50)}`,
          city: randomElement(['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng']),
          phoneNo: `09${randomInt(10000000, 99999999)}`,
          postalCode: `${randomInt(100000, 999999)}`,
          country: 'Vietnam'
        },
        orderItems: orderItems,
        paymentInfo: {
          id: `pi_mock_${Date.now()}_${i}`,
          status: randomElement(paymentStatuses)
        },
        paidAt: createdAt,
        itemsPrice: itemsPrice,
        taxPrice: taxPrice,
        shippingPrice: shippingPrice,
        totalPrice: totalPrice,
        orderStatus: orderStatus,
        deliveredAt: Math.random() > 0.5 ? new Date(new Date(createdAt).getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000).toISOString() : null,
        createdAt: createdAt,
        updatedAt: createdAt
      };

      orders.push(order);

      // Insert Order to DynamoDB
      const orderParams = {
        TableName: TABLE_NAME,
        Item: order
      };

      await docClient.put(orderParams).promise();

      // Insert OrderItems as separate entities (Single-Table Design)
      for (const item of orderItems) {
        const orderItemParams = {
          TableName: TABLE_NAME,
          Item: {
            PK: `ORDER#${orderId}`,
            SK: `ITEM#${item.product}`,
            GSI1PK: `PRODUCT#${item.product}`,
            GSI1SK: `ORDER#${orderId}`,
            EntityType: 'OrderItem',
            productId: item.product,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          }
        };
        
        await docClient.put(orderItemParams).promise();
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ Created ${i + 1}/100 orders`);
      }
    }

    console.log('\n✅ All 100 orders created successfully!\n');

    // Show statistics
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
      avgOrderValue: Math.round(orders.reduce((sum, o) => sum + o.totalPrice, 0) / orders.length),
      statusBreakdown: {
        Processing: orders.filter(o => o.orderStatus === 'Processing').length,
        Shipped: orders.filter(o => o.orderStatus === 'Shipped').length,
        Delivered: orders.filter(o => o.orderStatus === 'Delivered').length
      }
    };

    console.log('📊 Order Statistics:');
    console.log(`   Total Orders: ${stats.totalOrders}`);
    console.log(`   Total Revenue: ${stats.totalRevenue.toLocaleString('vi-VN')} VNĐ`);
    console.log(`   Avg Order Value: ${stats.avgOrderValue.toLocaleString('vi-VN')} VNĐ`);
    console.log(`   Status Breakdown:`);
    console.log(`     - Processing: ${stats.statusBreakdown.Processing}`);
    console.log(`     - Shipped: ${stats.statusBreakdown.Shipped}`);
    console.log(`     - Delivered: ${stats.statusBreakdown.Delivered}`);

    console.log('\n🎉 DynamoDB order seeding completed successfully!');
    console.log('💡 Now you can test "Frequently Bought Together" recommendations!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    process.exit(1);
  }
}

seedOrders();
