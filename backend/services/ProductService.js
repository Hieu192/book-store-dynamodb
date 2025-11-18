/**
 * Product Service
 * Business logic layer - sử dụng MigrationManager để chọn repository phù hợp
 */

const { getInstance } = require('./MigrationManager');

class ProductService {
  constructor() {
    this.migrationManager = getInstance();
  }

  /**
   * Get repository based on current migration phase
   */
  _getRepository() {
    return this.migrationManager.getRepository();
  }

  /**
   * Get all products with filters
   */
  async getProducts(filters) {
    const repo = this._getRepository();
    return await repo.findAll(filters);
  }

  /**
   * Get single product by ID
   */
  async getProduct(id) {
    const repo = this._getRepository();
    try {
      const product = await repo.findById(id);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      return product;
    } catch (error) {
      // Re-throw CastError for invalid ObjectId
      if (error.name === 'CastError') {
        throw error;
      }
      throw new Error('Product not found');
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData, userId) {
    const repo = this._getRepository();
    productData.user = userId;
    return await repo.create(productData);
  }

  /**
   * Update product
   */
  async updateProduct(id, updateData) {
    const repo = this._getRepository();
    const product = await repo.update(id, updateData);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  }

  /**
   * Delete product
   */
  async deleteProduct(id) {
    const repo = this._getRepository();
    const result = await repo.delete(id);
    
    if (!result) {
      throw new Error('Product not found');
    }
    
    return result;
  }

  /**
   * Create product review
   */
  async createReview(productId, reviewData) {
    const repo = this._getRepository();
    return await repo.addReview(productId, reviewData);
  }

  /**
   * Get product reviews
   */
  async getReviews(productId) {
    const repo = this._getRepository();
    return await repo.getReviews(productId);
  }

  /**
   * Delete review
   */
  async deleteReview(productId, reviewId) {
    const repo = this._getRepository();
    return await repo.deleteReview(productId, reviewId);
  }

  /**
   * Update product stock
   */
  async updateStock(productId, quantity) {
    const repo = this._getRepository();
    return await repo.updateStock(productId, quantity);
  }
}

module.exports = new ProductService();
