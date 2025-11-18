const User = require('../../models/user');
const Product = require('../../models/product');
const Order = require('../../models/order');
const Category = require('../../models/category');

// Helper to create test user
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

  const user = await User.create({ ...defaultUser, ...userData });
  return user;
};

// Helper to create admin user
const createAdminUser = async (userData = {}) => {
  return createTestUser({ ...userData, role: 'admin' });
};

// Helper to create test product
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

  const product = await Product.create({ ...defaultProduct, ...productData });
  return product;
};

// Helper to create test category
const createTestCategory = async (categoryData = {}) => {
  const defaultCategory = {
    name: 'Test Category',
    images: [{
      public_id: 'test_category_image',
      url: 'https://example.com/category.jpg'
    }]
  };

  const category = await Category.create({ ...defaultCategory, ...categoryData });
  return category;
};

// Helper to create test order
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

  const order = await Order.create({ ...defaultOrder, ...orderData });
  return order;
};

// Helper to get JWT token from user
const getAuthToken = (user) => {
  return user.getJwtToken();
};

// Helper to clean up database
const cleanupDatabase = async () => {
  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Category.deleteMany({});
};

// Helper to extract cookie from response
const extractCookie = (response, cookieName = 'token') => {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;
  
  const cookie = cookies.find(c => c.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  
  return cookie.split(';')[0].split('=')[1];
};

module.exports = {
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestCategory,
  createTestOrder,
  getAuthToken,
  cleanupDatabase,
  extractCookie
};
