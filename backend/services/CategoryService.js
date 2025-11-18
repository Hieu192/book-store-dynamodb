/**
 * Category Service
 * Business logic layer - sử dụng MigrationManager
 */

const { getInstance } = require('./MigrationManager');
const MongoCategoryRepository = require('../repositories/mongodb/MongoCategoryRepository');
const DynamoCategoryRepository = require('../repositories/dynamodb/DynamoCategoryRepository');

class CategoryService {
  constructor() {
    this.migrationManager = getInstance();
    this.mongoRepo = new MongoCategoryRepository();
    this.dynamoRepo = new DynamoCategoryRepository();
  }

  /**
   * Get repository based on current migration phase
   */
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

  /**
   * Create proxy for dual-write operations
   */
  _createDualWriteProxy(primaryRepo, secondaryRepo) {
    const self = this;
    
    return new Proxy(primaryRepo, {
      get(target, prop) {
        const originalMethod = target[prop];
        
        if (typeof originalMethod !== 'function') {
          return originalMethod;
        }

        // Read operations - only from primary
        const readOps = ['findById', 'findAll', 'findByName'];
        if (readOps.includes(prop)) {
          return originalMethod.bind(target);
        }

        // Write operations - dual write
        const writeOps = ['create', 'update', 'delete'];
        if (writeOps.includes(prop)) {
          return async function(...args) {
            try {
              // Write to primary first
              const primaryResult = await originalMethod.apply(target, args);
              
              // Write to secondary (async, don't wait)
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

  /**
   * Get all categories
   */
  async getCategories() {
    const repo = this._getRepository();
    return await repo.findAll();
  }

  /**
   * Get category by ID
   */
  async getCategory(id) {
    const repo = this._getRepository();
    const category = await repo.findById(id);
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    return category;
  }

  /**
   * Create category
   */
  async createCategory(categoryData) {
    const repo = this._getRepository();
    return await repo.create(categoryData);
  }

  /**
   * Update category
   */
  async updateCategory(id, updateData) {
    const repo = this._getRepository();
    const category = await repo.update(id, updateData);
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    return category;
  }

  /**
   * Delete category
   */
  async deleteCategory(id) {
    const repo = this._getRepository();
    try {
      const result = await repo.delete(id);
      
      if (!result) {
        throw new Error('Category not found');
      }
      
      return result;
    } catch (error) {
      // Re-throw CastError for invalid ObjectId
      if (error.name === 'CastError') {
        throw error;
      }
      throw new Error('Category not found');
    }
  }
}

module.exports = new CategoryService();
