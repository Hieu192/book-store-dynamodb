/**
 * Product Repository Interface
 * Defines contract for product data access
 */
class IProductRepository {
  async create(productData) {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findAll(filters = {}) {
    throw new Error('Method not implemented');
  }

  async update(id, updateData) {
    throw new Error('Method not implemented');
  }

  async delete(id) {
    throw new Error('Method not implemented');
  }

  async findByCategory(category, options = {}) {
    throw new Error('Method not implemented');
  }

  async search(keyword, options = {}) {
    throw new Error('Method not implemented');
  }

  async addReview(productId, reviewData) {
    throw new Error('Method not implemented');
  }

  async getReviews(productId) {
    throw new Error('Method not implemented');
  }

  async updateStock(productId, quantity) {
    throw new Error('Method not implemented');
  }
}

module.exports = IProductRepository;
