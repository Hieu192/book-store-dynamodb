/**
 * Order Service
 * Business logic layer - sử dụng MigrationManager
 */

const { getInstance } = require('./MigrationManager');
const MongoOrderRepository = require('../repositories/mongodb/MongoOrderRepository');
const DynamoOrderRepository = require('../repositories/dynamodb/DynamoOrderRepository');

class OrderService {
  constructor() {
    this.migrationManager = getInstance();
    this.mongoRepo = new MongoOrderRepository();
    this.dynamoRepo = new DynamoOrderRepository();
  }

  _getRepository() {
    const phase = this.migrationManager.getCurrentPhase();
    
    switch (phase) {
      case 'MONGODB_ONLY':
        return this.mongoRepo;
      case 'DUAL_WRITE_MONGO_PRIMARY':
        return this._createDualWriteProxy(this.mongoRepo, this.dynamoRepo);
      case 'DUAL_WRITE_DYNAMO_PRIMARY':
        return this._createDualWriteProxy(this.dynamoRepo, this.mongoRepo);
      case 'DYNAMODB_ONLY':
        return this.dynamoRepo;
      default:
        return this.mongoRepo;
    }
  }

  _createDualWriteProxy(primaryRepo, secondaryRepo) {
    return new Proxy(primaryRepo, {
      get(target, prop) {
        const originalMethod = target[prop];
        if (typeof originalMethod !== 'function') return originalMethod;

        const readOps = ['findById', 'findByUser', 'findAll'];
        if (readOps.includes(prop)) {
          return originalMethod.bind(target);
        }

        const writeOps = ['create', 'update', 'delete'];
        if (writeOps.includes(prop)) {
          return async function(...args) {
            try {
              const primaryResult = await originalMethod.apply(target, args);
              secondaryRepo[prop](...args).catch(err => {
                console.error(`❌ Secondary write failed (${prop}):`, err.message);
              });
              return primaryResult;
            } catch (error) {
              console.error(`❌ Primary write failed (${prop}):`, error.message);
              throw error;
            }
          };
        }

        return originalMethod.bind(target);
      }
    });
  }

  async createOrder(orderData) {
    const repo = this._getRepository();
    return await repo.create(orderData);
  }

  async getOrder(id) {
    const repo = this._getRepository();
    return await repo.findById(id);
  }

  async getMyOrders(userId) {
    const repo = this._getRepository();
    return await repo.findByUser(userId);
  }

  async getAllOrders() {
    const repo = this._getRepository();
    return await repo.findAll();
  }

  async updateOrder(id, updateData) {
    const repo = this._getRepository();
    return await repo.update(id, updateData);
  }

  async deleteOrder(id) {
    const repo = this._getRepository();
    return await repo.delete(id);
  }

  /**
   * Get orders containing a specific product
   * Used for "Frequently Bought Together" recommendations
   */
  async getOrdersContainingProduct(productId) {
    const repo = this._getRepository();
    const allOrders = await repo.findAll();
    
    // Filter orders that contain the product
    const ordersWithProduct = allOrders.filter(order => {
      return order.orderItems && order.orderItems.some(item => {
        const itemProductId = item.product?._id || item.product;
        return itemProductId.toString() === productId.toString();
      });
    });

    return ordersWithProduct;
  }
}

module.exports = new OrderService();
