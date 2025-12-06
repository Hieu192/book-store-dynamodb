const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: 'config/config.env' });

// Set test environment
process.env.NODE_ENV = 'TEST';

// Force DynamoDB mode for tests (match production)
process.env.MIGRATION_PHASE = 'DYNAMODB_ONLY';

// Mock external services to avoid API calls
jest.mock('cloudinary');
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

// Increase timeout for all tests
jest.setTimeout(30000);

// Setup test environment
beforeAll(async () => {
  try {
    console.log('✅ Test environment ready (DynamoDB mode)');
    console.log(`   MIGRATION_PHASE: ${process.env.MIGRATION_PHASE}`);
    console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'ap-southeast-1'}`);

    // Skip MongoDB connection by clearing DB_URI
    process.env.DB_URI = '';

    // DynamoDB doesn't require connection setup like MongoDB
    // AWS SDK will auto-connect when making requests to DynamoDB
    // Tests will use real AWS DynamoDB (requires AWS credentials)
  } catch (error) {
    console.error('Test setup error:', error);
    process.exit(1);
  }
});

// Clean up after each test
afterEach(async () => {
  // Tests should clean up their own test data from DynamoDB
});

// Cleanup after all tests
afterAll(async () => {
  try {
    console.log('✅ Test cleanup complete');
    // DynamoDB doesn't need explicit disconnection like MongoDB
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});
