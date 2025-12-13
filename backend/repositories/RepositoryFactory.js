/**
 * Repository Factory
 * Factory pattern để tạo repositories dựa trên database type
 * Dễ dàng switch giữa MongoDB, DynamoDB, PostgreSQL, etc.
 */

// MongoDB Repositories
const MongoProductRepository = require('./mongodb/MongoProductRepository');
const MongoUserRepository = require('./mongodb/MongoUserRepository');

// DynamoDB Repositories
const DynamoChatbotRepository = require('./dynamodb/DynamoChatbotRepository');
// const DynamoProductRepository = require('./dynamodb/DynamoProductRepository');
// const DynamoUserRepository = require('./dynamodb/DynamoUserRepository');

class RepositoryFactory {
  constructor() {
    // Get database type from environment variable
    this.dbType = process.env.DB_TYPE || 'mongodb';

    // Cache repositories
    this._productRepository = null;
    this._userRepository = null;
    this._chatbotRepository = null;
  }

  /**
   * Get Product Repository
   * @returns {IProductRepository}
   */
  getProductRepository() {
    if (this._productRepository) {
      return this._productRepository;
    }

    switch (this.dbType.toLowerCase()) {
      case 'mongodb':
        this._productRepository = new MongoProductRepository();
        break;

      case 'dynamodb':
        // Uncomment when DynamoDB implementation is ready
        // this._productRepository = new DynamoProductRepository();
        throw new Error('DynamoDB implementation not yet available');

      default:
        throw new Error(`Unsupported database type: ${this.dbType}`);
    }

    return this._productRepository;
  }

  /**
   * Get User Repository
   * @returns {IUserRepository}
   */
  getUserRepository() {
    if (this._userRepository) {
      return this._userRepository;
    }

    switch (this.dbType.toLowerCase()) {
      case 'mongodb':
        this._userRepository = new MongoUserRepository();
        break;

      case 'dynamodb':
        // Uncomment when DynamoDB implementation is ready
        // this._userRepository = new DynamoUserRepository();
        throw new Error('DynamoDB implementation not yet available');

      default:
        throw new Error(`Unsupported database type: ${this.dbType}`);
    }

    return this._userRepository;
  }

  /**
   * Get Chatbot Repository
   * Note: Chatbot only supports DynamoDB (WebSocket connections are stored there)
   * @returns {DynamoChatbotRepository}
   */
  getChatbotRepository() {
    if (this._chatbotRepository) {
      return this._chatbotRepository;
    }

    // Chatbot always uses DynamoDB regardless of DB_TYPE
    // because WebSocket connections and conversations are stored in DynamoDB
    this._chatbotRepository = new DynamoChatbotRepository();
    return this._chatbotRepository;
  }

  /**
   * Get current database type
   */
  getDatabaseType() {
    return this.dbType;
  }

  /**
   * Reset cached repositories (useful for testing)
   */
  reset() {
    this._productRepository = null;
    this._userRepository = null;
    this._chatbotRepository = null;
  }
}

// Export singleton instance
module.exports = new RepositoryFactory();
