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
   * ✅ BUSINESS RULE: Category must exist before creating product
   */
  async createProduct(productData, userId) {
    // ✅ VALIDATION: Check if category is provided
    if (!productData.category) {
      throw new Error('Category is required');
    }

    // ✅ VALIDATION: Check if category exists
    const categoryService = require('./CategoryService');
    try {
      const categoryExists = await categoryService.getCategoryByName(productData.category);
      if (!categoryExists) {
        throw new Error(`Category "${productData.category}" does not exist. Please create the category first.`);
      }
    } catch (error) {
      // If category not found, throw specific error
      throw new Error(`Category "${productData.category}" does not exist. Please create the category first.`);
    }

    const repo = this._getRepository();
    productData.user = userId;
    return await repo.create(productData);
  }

  /**
   * Update product
   */
  async updateProduct(id, updateData) {
    // ✅ VALIDATION: If category is being updated, check if it exists
    if (updateData.category) {
      const categoryService = require('./CategoryService');
      try {
        const categoryExists = await categoryService.getCategoryByName(updateData.category);
        if (!categoryExists) {
          throw new Error(`Category "${updateData.category}" does not exist. Please create the category first.`);
        }
      } catch (error) {
        throw new Error(`Category "${updateData.category}" does not exist. Please create the category first.`);
      }
    }

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

  /**
   * Get related products
   */
  async getRelatedProducts(productId, limit = 6) {
    const repo = this._getRepository();
    return await repo.getRelatedProducts(productId, limit);
  }

  /**
   * Get best sellers
   */
  async getBestSellers(limit = 10, category = null) {
    const repo = this._getRepository();
    return await repo.getBestSellers(limit, category);
  }

  /**
   * Get products by IDs (for recently viewed)
   */
  async getProductsByIds(productIds) {
    const repo = this._getRepository();
    return await repo.getProductsByIds(productIds);
  }

  /**
   * ✅ NEW: Get products with cursor-based pagination
   * More efficient for large datasets
   */
  async getProductsWithCursor(filters, limit, cursor) {
    const repo = this._getRepository();

    // Check if repository supports cursor pagination
    if (typeof repo.findAllWithCursor === 'function') {
      return await repo.findAllWithCursor(filters, limit, cursor);
    }

    // Fallback to regular pagination
    const result = await repo.findAll(filters);
    return {
      products: result.products,
      nextCursor: null,
      hasMore: false
    };
  }
}

module.exports = new ProductService();
