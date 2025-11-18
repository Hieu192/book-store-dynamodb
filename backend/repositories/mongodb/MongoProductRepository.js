const IProductRepository = require('../interfaces/IProductRepository');
const Product = require('../../models/product');
const APIFeatures = require('../../utils/apiFeatures');

/**
 * MongoDB Implementation of Product Repository
 */
class MongoProductRepository extends IProductRepository {
  /**
   * Find product by ID
   */
  async findById(id) {
    return await Product.findById(id);
  }

  /**
   * Find all products with filters
   */
  async findAll(filters = {}, options = {}) {
    const {
      keyword,
      page = 1,
      limit: rawLimit = 10,
      sortByPrice,
      sort,
      ...queryFilters
    } = filters;
    
    // Ensure limit is a number, 0 means no limit (get all)
    const limit = rawLimit === 0 || rawLimit === '0' ? 0 : (parseInt(rawLimit) || 10);

    // Build query
    let query = Product.find();

    // Apply APIFeatures
    const apiFeatures = new APIFeatures(query, {
      keyword,
      ...queryFilters,
      page,
      limit,
      sortByPrice,
      sort
    });

    apiFeatures.search().filter().sort();
    
    // Only apply pagination if limit > 0
    if (limit > 0) {
      apiFeatures.pagination(limit);
    }

    // Execute query
    const products = await apiFeatures.query;

    // Get total count
    const countQuery = Product.find();
    const countFeatures = new APIFeatures(countQuery, {
      keyword,
      ...queryFilters
    });
    countFeatures.search().filter();
    const totalCount = await Product.countDocuments(countFeatures.query.getQuery());

    return {
      products,
      count: totalCount,
      page: parseInt(page),
      pages: limit > 0 ? Math.ceil(totalCount / limit) : 1
    };
  }

  /**
   * Create new product
   */
  async create(productData) {
    const product = await Product.create(productData);
    return product;
  }

  /**
   * Update product by ID
   */
  async update(id, updateData) {
    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
        useFindAndModify: false
      }
    );
    return product;
  }

  /**
   * Delete product by ID
   */
  async delete(id) {
    const result = await Product.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Search products
   */
  async search(keyword, options = {}) {
    const { limit = 10, page = 1 } = options;

    const apiFeatures = new APIFeatures(
      Product.find(),
      { keyword, page, limit }
    );

    apiFeatures.search().pagination(limit);

    const products = await apiFeatures.query;
    return products;
  }

  /**
   * Count products with filters
   */
  async count(filters = {}) {
    const { keyword, ...queryFilters } = filters;

    const query = Product.find();
    const apiFeatures = new APIFeatures(query, {
      keyword,
      ...queryFilters
    });

    apiFeatures.search().filter();

    return await Product.countDocuments(apiFeatures.query.getQuery());
  }

  /**
   * Find products by category
   */
  async findByCategory(category, options = {}) {
    const { limit = 10, page = 1 } = options;

    const apiFeatures = new APIFeatures(
      Product.find(),
      { category, page, limit }
    );

    apiFeatures.filter().pagination(limit);

    const products = await apiFeatures.query;
    return products;
  }

  /**
   * Update product stock
   */
  async updateStock(id, quantity) {
    const product = await Product.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    product.stock += quantity;

    if (product.stock < 0) {
      throw new Error('Insufficient stock');
    }

    await product.save();
    return product;
  }

  /**
   * Add review to product
   */
  async addReview(productId, review) {
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if user already reviewed
    const isReviewed = product.reviews.find(
      r => r.user.toString() === review.user.toString()
    );

    if (isReviewed) {
      // Update existing review
      product.reviews.forEach(r => {
        if (r.user.toString() === review.user.toString()) {
          r.rating = review.rating;
          r.comment = review.comment;
        }
      });
    } else {
      // Add new review
      product.reviews.push(review);
      product.numOfReviews = product.reviews.length;
    }

    // Calculate average rating
    product.ratings = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save({ validateBeforeSave: false });
    return product;
  }

  /**
   * Get product reviews
   */
  async getReviews(productId) {
    const product = await Product.findById(productId).select('reviews');
    
    if (!product) {
      throw new Error('Product not found');
    }

    return product.reviews;
  }

  /**
   * Delete review
   */
  async deleteReview(productId, reviewId) {
    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    product.reviews = product.reviews.filter(
      review => review._id.toString() !== reviewId.toString()
    );

    product.numOfReviews = product.reviews.length;

    product.ratings = product.reviews.length > 0
      ? product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length
      : 0;

    await product.save({ validateBeforeSave: false });
    return product;
  }
}

module.exports = MongoProductRepository;
