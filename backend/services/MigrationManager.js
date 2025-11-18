/**
 * ============================================================================
 * MIGRATION MANAGER
 * ============================================================================
 * 
 * Quản lý quá trình migration từ MongoDB sang DynamoDB một cách an toàn
 * 
 * CHỨC NĂNG CHÍNH:
 * - Quản lý 4 giai đoạn migration
 * - Dual-write để đồng bộ data giữa 2 databases
 * - Error logging và monitoring
 * - Data consistency verification
 * 
 * CÁC GIAI ĐOẠN MIGRATION:
 * 1. MONGODB_ONLY: Chỉ dùng MongoDB (trạng thái ban đầu)
 * 2. DUAL_WRITE_MONGO_PRIMARY: Ghi cả 2 DB, đọc từ MongoDB (bắt đầu sync)
 * 3. DUAL_WRITE_DYNAMO_PRIMARY: Ghi cả 2 DB, đọc từ DynamoDB (test DynamoDB)
 * 4. DYNAMODB_ONLY: Chỉ dùng DynamoDB (hoàn thành migration)
 * 
 * CÁCH SỬ DỤNG:
 * ```javascript
 * const { getInstance } = require('./MigrationManager');
 * const manager = getInstance();
 * 
 * // Thay đổi phase
 * manager.setPhase('DUAL_WRITE_MONGO_PRIMARY');
 * 
 * // Lấy repository phù hợp với phase hiện tại
 * const repo = manager.getRepository();
 * const products = await repo.findAll();
 * ```
 * 
 * @author Your Team
 * @version 1.0.0
 */

const MongoProductRepository = require('../repositories/mongodb/MongoProductRepository');
const DynamoProductRepository = require('../repositories/dynamodb/DynamoProductRepository');

/**
 * Migration Phases:
 * 1. MONGODB_ONLY - Chỉ đọc/ghi MongoDB
 * 2. DUAL_WRITE_MONGO_PRIMARY - Ghi cả 2, đọc từ MongoDB
 * 3. DUAL_WRITE_DYNAMO_PRIMARY - Ghi cả 2, đọc từ DynamoDB
 * 4. DYNAMODB_ONLY - Chỉ đọc/ghi DynamoDB
 */

class MigrationManager {
  constructor() {
    this.mongoRepo = new MongoProductRepository();
    this.dynamoRepo = new DynamoProductRepository();
    this.currentPhase = process.env.MIGRATION_PHASE || 'DYNAMODB_ONLY';
    this.errorLog = [];
  }

  /**
   * Lấy phase hiện tại của migration
   * 
   * @returns {string} Phase hiện tại (MONGODB_ONLY, DUAL_WRITE_MONGO_PRIMARY, etc.)
   * 
   * @example
   * const phase = manager.getCurrentPhase();
   * console.log(phase); // 'MONGODB_ONLY'
   */
  getCurrentPhase() {
    return this.currentPhase;
  }

  /**
   * Thay đổi phase của migration
   * 
   * QUAN TRỌNG: Phải thay đổi phase theo thứ tự:
   * MONGODB_ONLY → DUAL_WRITE_MONGO_PRIMARY → DUAL_WRITE_DYNAMO_PRIMARY → DYNAMODB_ONLY
   * 
   * @param {string} phase - Phase mới (phải là 1 trong 4 phases hợp lệ)
   * @throws {Error} Nếu phase không hợp lệ
   * 
   * @example
   * // Bắt đầu dual-write
   * manager.setPhase('DUAL_WRITE_MONGO_PRIMARY');
   * 
   * // Sau khi data đã sync, chuyển sang đọc từ DynamoDB
   * manager.setPhase('DUAL_WRITE_DYNAMO_PRIMARY');
   * 
   * // Sau khi test OK, chuyển hoàn toàn sang DynamoDB
   * manager.setPhase('DYNAMODB_ONLY');
   */
  setPhase(phase) {
    const validPhases = [
      'MONGODB_ONLY',
      'DUAL_WRITE_MONGO_PRIMARY',
      'DUAL_WRITE_DYNAMO_PRIMARY',
      'DYNAMODB_ONLY'
    ];

    if (!validPhases.includes(phase)) {
      throw new Error(`Invalid phase: ${phase}`);
    }

    this.currentPhase = phase;
    process.env.MIGRATION_PHASE = phase;
    console.log(`✅ Migration phase changed to: ${phase}`);
  }

  /**
   * Lấy repository phù hợp với phase hiện tại
   * 
   * LOGIC:
   * - MONGODB_ONLY: Trả về MongoProductRepository
   * - DUAL_WRITE_MONGO_PRIMARY: Trả về Proxy (đọc Mongo, ghi cả 2)
   * - DUAL_WRITE_DYNAMO_PRIMARY: Trả về Proxy (đọc Dynamo, ghi cả 2)
   * - DYNAMODB_ONLY: Trả về DynamoProductRepository
   * 
   * @returns {Object} Repository instance (MongoDB, DynamoDB, hoặc Proxy)
   * 
   * @example
   * const repo = manager.getRepository();
   * 
   * // Sử dụng như bình thường, không cần biết đang dùng DB nào
   * const products = await repo.findAll({ category: 'Electronics' });
   * await repo.create({ name: 'New Product', price: 99.99 });
   */
  getRepository() {
    switch (this.currentPhase) {
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
   * Tạo Proxy để thực hiện dual-write
   * 
   * CÁCH HOẠT ĐỘNG:
   * 1. Read operations: Chỉ đọc từ primary database
   * 2. Write operations: 
   *    - Ghi vào primary database trước (đợi kết quả)
   *    - Ghi vào secondary database sau (async, không đợi)
   *    - Nếu secondary fail, log error nhưng không throw
   * 
   * LỢI ÍCH:
   * - Đảm bảo primary database luôn consistent
   * - Secondary database được sync dần dần
   * - Không ảnh hưởng performance (secondary write là async)
   * - Có thể rollback dễ dàng nếu có vấn đề
   * 
   * @param {Object} primaryRepo - Repository chính (đọc và ghi)
   * @param {Object} secondaryRepo - Repository phụ (chỉ ghi)
   * @returns {Proxy} Proxy object wrap primaryRepo với dual-write logic
   * 
   * @private
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
        const readOps = ['findById', 'findAll', 'search', 'count', 'findByCategory', 'getReviews'];
        if (readOps.includes(prop)) {
          return originalMethod.bind(target);
        }

        // Write operations - dual write
        const writeOps = ['create', 'update', 'delete', 'updateStock', 'addReview', 'deleteReview'];
        if (writeOps.includes(prop)) {
          return async function(...args) {
            try {
              // Write to primary first
              const primaryResult = await originalMethod.apply(target, args);
              
              // Write to secondary (async, don't wait)
              self._writeToSecondary(secondaryRepo, prop, args).catch(err => {
                self._logError('Secondary write failed', prop, args, err);
              });
              
              return primaryResult;
            } catch (error) {
              self._logError('Primary write failed', prop, args, error);
              throw error;
            }
          };
        }

        return originalMethod.bind(target);
      }
    });
  }

  /**
   * Write to secondary database
   */
  async _writeToSecondary(repo, method, args) {
    try {
      await repo[method](...args);
      console.log(`✅ Secondary write success: ${method}`);
    } catch (error) {
      console.error(`❌ Secondary write failed: ${method}`, error.message);
      throw error;
    }
  }

  /**
   * Log errors
   */
  _logError(message, operation, args, error) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message,
      operation,
      args: JSON.stringify(args),
      error: error.message,
      stack: error.stack
    };
    
    this.errorLog.push(errorEntry);
    console.error('❌ Migration Error:', errorEntry);
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Kiểm tra tính nhất quán của data giữa MongoDB và DynamoDB
   * 
   * CÁCH HOẠT ĐỘNG:
   * 1. Lấy sample products từ MongoDB
   * 2. Với mỗi product, tìm trong DynamoDB
   * 3. So sánh các fields quan trọng (name, price, stock, category)
   * 4. Trả về kết quả: matched, mismatched, errors
   * 
   * SỬ DỤNG:
   * - Chạy sau khi bật DUAL_WRITE để verify data đã sync
   * - Chạy trước khi chuyển sang DYNAMODB_ONLY
   * - Chạy định kỳ để monitor data consistency
   * 
   * @param {number} sampleSize - Số lượng products để kiểm tra (default: 10)
   * @returns {Promise<Object>} Kết quả verification
   *   - total: Tổng số products kiểm tra
   *   - matched: Số products khớp
   *   - mismatched: Số products không khớp
   *   - errors: Array các lỗi chi tiết
   * 
   * @example
   * const result = await manager.verifyConsistency(100);
   * console.log(`Matched: ${result.matched}/${result.total}`);
   * if (result.mismatched > 0) {
   *   console.error('Errors:', result.errors);
   * }
   */
  async verifyConsistency(sampleSize = 10) {
    console.log(`🔍 Verifying data consistency (sample size: ${sampleSize})...`);
    
    const results = {
      total: 0,
      matched: 0,
      mismatched: 0,
      errors: []
    };

    try {
      // Get sample products from MongoDB
      const mongoProducts = await this.mongoRepo.findAll({}, { limit: sampleSize });
      results.total = mongoProducts.products.length;

      for (const mongoProduct of mongoProducts.products) {
        try {
          const dynamoProduct = await this.dynamoRepo.findById(mongoProduct._id);
          
          if (!dynamoProduct) {
            results.mismatched++;
            results.errors.push({
              id: mongoProduct._id,
              error: 'Product not found in DynamoDB'
            });
            continue;
          }

          // Compare key fields
          const fieldsToCompare = ['name', 'price', 'stock', 'category'];
          let isMatch = true;

          for (const field of fieldsToCompare) {
            if (mongoProduct[field] !== dynamoProduct[field]) {
              isMatch = false;
              results.errors.push({
                id: mongoProduct._id,
                field,
                mongoValue: mongoProduct[field],
                dynamoValue: dynamoProduct[field]
              });
            }
          }

          if (isMatch) {
            results.matched++;
          } else {
            results.mismatched++;
          }
        } catch (error) {
          results.mismatched++;
          results.errors.push({
            id: mongoProduct._id,
            error: error.message
          });
        }
      }

      console.log(`✅ Verification complete:`, results);
      return results;
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }

  /**
   * Get migration statistics
   */
  async getStatistics() {
    try {
      const [mongoCount, dynamoCount] = await Promise.all([
        this.mongoRepo.count(),
        this.dynamoRepo.count()
      ]);

      return {
        phase: this.currentPhase,
        mongodb: {
          count: mongoCount
        },
        dynamodb: {
          count: dynamoCount
        },
        errorCount: this.errorLog.length
      };
    } catch (error) {
      console.error('❌ Failed to get statistics:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new MigrationManager();
    }
    return instance;
  },
  MigrationManager
};
