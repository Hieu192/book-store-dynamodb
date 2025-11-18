const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: 'config/config.env' });

// Set test environment
process.env.NODE_ENV = 'TEST';

// Force MongoDB mode for tests (unless test explicitly changes it)
process.env.MIGRATION_PHASE = 'MONGODB_ONLY';

// Mock external services to avoid API calls
jest.mock('cloudinary');
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

// Increase timeout for all tests
jest.setTimeout(30000);

// Connect to test database before all tests
beforeAll(async () => {
  try {
    // Use test database
    const testDbUri = process.env.TEST_DB_URI || 'mongodb://127.0.0.1:27017/shopit_test';
    
    await mongoose.connect(testDbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Test database connected');
  } catch (error) {
    console.error('Test database connection error:', error);
    process.exit(1);
  }
});

// Clean up after each test
afterEach(async () => {
  // Optional: Clear collections after each test
  // const collections = mongoose.connection.collections;
  // for (const key in collections) {
  //   await collections[key].deleteMany();
  // }
});

// Disconnect after all tests
afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('Test database disconnected');
  } catch (error) {
    console.error('Error closing test database:', error);
  }
});
