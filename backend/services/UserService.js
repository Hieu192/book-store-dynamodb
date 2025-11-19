/**
 * User Service
 * Business logic layer - sử dụng MigrationManager
 */

const { getInstance } = require('./MigrationManager');
const MongoUserRepository = require('../repositories/mongodb/MongoUserRepository');
const DynamoUserRepository = require('../repositories/dynamodb/DynamoUserRepository');

class UserService {
  constructor() {
    this.migrationManager = getInstance();
    this.mongoRepo = new MongoUserRepository();
    this.dynamoRepo = new DynamoUserRepository();
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

        const readOps = ['findById', 'findByEmail', 'findAll'];
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

  async getUser(id) {
    const repo = this._getRepository();
    return await repo.findById(id);
  }

  async getUserWithPassword(id) {
    const repo = this._getRepository();
    const user = await repo.findById(id);
    // For MongoDB, we need to select password explicitly
    if (this.migrationManager.getCurrentPhase().includes('MONGO')) {
      const User = require('../models/user');
      return await User.findById(id).select('+password');
    }
    return user;
  }

  async getUserByEmail(email) {
    const repo = this._getRepository();
    return await repo.findByEmail(email);
  }

  async getUserByEmailWithPassword(email) {
    const repo = this._getRepository();
    const user = await repo.findByEmail(email);
    // For MongoDB, we need to select password explicitly
    if (this.migrationManager.getCurrentPhase().includes('MONGO')) {
      const User = require('../models/user');
      return await User.findOne({ email }).select('+password');
    }
    return user;
  }

  async createUser(userData) {
    const repo = this._getRepository();
    return await repo.create(userData);
  }

  async updateUser(id, updateData) {
    const repo = this._getRepository();
    return await repo.update(id, updateData);
  }

  async deleteUser(id) {
    const repo = this._getRepository();
    return await repo.delete(id);
  }

  async getAllUsers() {
    const repo = this._getRepository();
    return await repo.findAll();
  }
}

module.exports = new UserService();
