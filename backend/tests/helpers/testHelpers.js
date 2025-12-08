// Import Services (singleton instances)
const userService = require('../../services/UserService');
const productService = require('../../services/ProductService');
const orderService = require('../../services/OrderService');
const categoryService = require('../../services/CategoryService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import MongoDB models cho cleanup (vẫn cần vì có thể có data cũ)
const User = require('../../models/user');
const Product = require('../../models/product');
const Order = require('../../models/order');
const Category = require('../../models/category');

// Helper to create test user (works with both MongoDB & DynamoDB)
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    avatar: {
      public_id: 'test_avatar',
      url: 'https://example.com/avatar.jpg'
    },
    role: 'user'
  };

  // Use UserService (supports migration phases)
  const user = await userService.createUser({ ...defaultUser, ...userData });

  // Add helper methods to user object
  user.getJwtToken = function () {
    return jwt.sign({ id: user.id || user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_TIME
    });
  };

  user.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, user.password);
  };

  return user;
};

// Helper to create admin user
const createAdminUser = async (userData = {}) => {
  return createTestUser({ ...userData, role: 'admin' });
};

// Helper to create test product (works with both MongoDB & DynamoDB)
const createTestProduct = async (userId, productData = {}) => {
  const defaultProduct = {
    name: 'Test Product',
    price: 99.99,
    description: 'Test product description',
    ratings: 4.5,
    images: [{
      public_id: 'test_image',
      url: 'https://example.com/product.jpg'
    }],
    category: 'Electronics',
    seller: 'Test Seller',
    stock: 10,
    numOfReviews: 0,
    reviews: [],
    user: userId
  };

  const finalProductData = { ...defaultProduct, ...productData };

  // ✅ BUSINESS RULE: Ensure category exists before creating product
  if (finalProductData.category) {
    try {
      // Check if category exists
      const existingCategory = await categoryService.getCategoryByName(finalProductData.category);
      if (!existingCategory) {
        // Create category if it doesn't exist
        await categoryService.createCategory({
          name: finalProductData.category,
          images: [{
            public_id: `test_category_${finalProductData.category}`,
            url: 'https://example.com/category.jpg'
          }]
        });
        console.log(`✅ Auto-created category: ${finalProductData.category}`);
      }
    } catch (error) {
      // Category doesn't exist, create it
      await categoryService.createCategory({
        name: finalProductData.category,
        images: [{
          public_id: `test_category_${finalProductData.category}`,
          url: 'https://example.com/category.jpg'
        }]
      });
      console.log(`✅ Auto-created category: ${finalProductData.category}`);
    }
  }

  // Use ProductService (supports migration phases)
  const product = await productService.createProduct(finalProductData, userId);
  return product;
};

// Helper to create test category (still uses MongoDB model - can update later)
const createTestCategory = async (categoryData = {}) => {
  const defaultCategory = {
    name: 'Test Category',
    images: [{
      public_id: 'test_category_image',
      url: 'https://example.com/category.jpg'
    }]
  };

  // Use CategoryService
  const category = await categoryService.createCategory({ ...defaultCategory, ...categoryData });
  return category;
};

// Helper to create test order (still uses MongoDB model - can update later)
const createTestOrder = async (userId, orderData = {}) => {
  const defaultOrder = {
    shippingInfo: {
      address: '123 Test Street',
      city: 'Test City',
      phoneNo: '1234567890',
      postalCode: '12345',
      country: 'Test Country'
    },
    user: userId,
    orderCode: Date.now(),
    orderItems: [{
      name: 'Test Product',
      quantity: 1,
      image: 'https://example.com/product.jpg',
      price: 99.99,
      product: '507f1f77bcf86cd799439011' // dummy product id
    }],
    paymentInfo: {
      id: 'test_payment_id',
      status: 'succeeded'
    },
    itemsPrice: 99.99,
    taxPrice: 9.99,
    shippingPrice: 5.00,
    totalPrice: 114.98,
    orderStatus: 'Processing'
  };

  const finalOrderData = { ...defaultOrder, ...orderData };

  // ✅ Reduce stock for order items (matching new business logic)
  if (finalOrderData.orderItems && Array.isArray(finalOrderData.orderItems)) {
    for (const item of finalOrderData.orderItems) {
      // Only reduce stock if product ID is not the dummy ID
      if (item.product && item.product !== '507f1f77bcf86cd799439011') {
        try {
          await productService.updateStock(item.product, -item.quantity);
        } catch (error) {
          // Ignore errors for non-existent products (test data)
          console.log(`⚠️  Could not reduce stock for product ${item.product}: ${error.message}`);
        }
      }
    }
  }

  // Use OrderService
  const order = await orderService.createOrder(finalOrderData);
  return order;
};

// Helper to get JWT token from user
const getAuthToken = (user) => {
  if (typeof user.getJwtToken === 'function') {
    return user.getJwtToken();
  }
  // Fallback: generate token manually
  return jwt.sign({ id: user.id || user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME
  });
};

// Helper to clean up database (supports both MongoDB & DynamoDB)
const cleanupDatabase = async () => {
  const phase = process.env.MIGRATION_PHASE || 'DYNAMODB_ONLY';

  if (phase.includes('MONGO')) {
    // Clean MongoDB
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Category.deleteMany({});
  }

  if (phase.includes('DYNAMO')) {
    // ✅ IMPROVED: Clean DynamoDB - scan ALL pages and delete all items
    const AWS = require('aws-sdk');
    const dynamodb = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const tableName = 'BookStore';
    let totalDeleted = 0;

    try {
      let lastEvaluatedKey = null;

      // ✅ Scan ALL pages (DynamoDB returns max 1MB per scan)
      do {
        const scanParams = {
          TableName: tableName,
          ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
        };

        const scanResult = await dynamodb.scan(scanParams).promise();

        // Delete items from this page
        if (scanResult.Items && scanResult.Items.length > 0) {
          const deletePromises = scanResult.Items.map(item => {
            return dynamodb.delete({
              TableName: tableName,
              Key: {
                PK: item.PK,
                SK: item.SK
              }
            }).promise();
          });

          await Promise.all(deletePromises);
          totalDeleted += scanResult.Items.length;
        }

        lastEvaluatedKey = scanResult.LastEvaluatedKey;

      } while (lastEvaluatedKey); // Continue until no more items

      if (totalDeleted > 0) {
        console.log(`🗑️  Cleaned ${totalDeleted} items from DynamoDB`);
      }
    } catch (error) {
      console.log('⚠️  DynamoDB cleanup error:', error.message);
    }
  }
};

// Helper to extract cookie from response
const extractCookie = (response, cookieName = 'token') => {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;

  const cookie = cookies.find(c => c.startsWith(`${cookieName}=`));
  if (!cookie) return null;

  return cookie.split(';')[0].split('=')[1];
};

// Helper to cleanup test products for a specific user
const cleanupTestProducts = async (userId) => {
  if (process.env.MIGRATION_PHASE === 'DYNAMODB_ONLY') {
    const DynamoProductRepository = require('../../repositories/dynamodb/DynamoProductRepository');
    const repo = new DynamoProductRepository();
    await repo.deleteProductsByUser(userId);
  } else {
    // MongoDB cleanup
    await Product.deleteMany({ user: userId });
  }
};

module.exports = {
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestCategory,
  createTestOrder,
  getAuthToken,
  cleanupDatabase,
  cleanupTestProducts,
  extractCookie
};
