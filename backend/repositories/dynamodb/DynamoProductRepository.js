const IProductRepository = require('../interfaces/IProductRepository');
const AWS = require('aws-sdk');

/**
 * DynamoDB Implementation of Product Repository
 * Single-Table Design theo DYNAMODB_DESIGN.md
 */
class DynamoProductRepository extends IProductRepository {
  constructor() {
    super();

    // Cấu hình DynamoDB
    this.dynamodb = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      convertEmptyValues: true
    });

    this.tableName = 'BookStore';
  }

  /**
   * Generate Product PK/SK
   */
  _getProductKeys(id) {
    return {
      PK: `PRODUCT#${id}`,
      SK: 'METADATA'
    };
  }

  /**
   * Transform MongoDB product to DynamoDB format
   */
  _transformToDynamo(productData, id = null) {
    const productId = id ? String(id) : this._generateId();
    const timestamp = new Date().toISOString();

    // Tính price range cho GSI2PK
    const priceRange = this._getPriceRange(productData.price);

    // Transform images - store path only
    // Expects images to have 'path' field (e.g., /products/abc.jpg)
    const imageArray = Array.isArray(productData.images) ? productData.images : [];
    const images = imageArray.map(img => ({
      public_id: img.public_id,
      path: img.path || img.url  // Use path if available, fallback to url
    }));

    // Generate normalized name for better search
    const nameNormalized = this._removeVietnameseAccents(productData.name.toLowerCase());

    return {
      ...this._getProductKeys(productId),
      GSI1PK: `CATEGORY#${productData.category}`,
      GSI1SK: `${timestamp}#${productId}`,
      GSI2PK: `PRICE#${priceRange}`,
      GSI2SK: `RATING#${productData.ratings || 0}#${productId}`,
      EntityType: 'Product',
      productId,
      name: productData.name,
      nameNormalized: nameNormalized,
      price: productData.price,
      description: productData.description,
      ratings: productData.ratings || 0,
      numOfReviews: productData.numOfReviews || 0,
      stock: productData.stock,
      seller: productData.seller,
      category: productData.category,
      images: images,
      userId: productData.user,
      version: productData.version || 0,  // ✅ Add version for optimistic locking
      createdAt: productData.createdAt || timestamp,
      updatedAt: timestamp
    };
  }

  /**
   * Transform DynamoDB item to MongoDB-like format
   */
  _transformFromDynamo(item) {
    if (!item) return null;

    // Transform images - reconstruct full URL from path
    // Combine CloudFront URL with stored path
    let images = [];
    if (item.images) {
      let imageArray = [];

      if (Array.isArray(item.images)) {
        imageArray = item.images;
      } else if (item.images.L) {
        imageArray = item.images.L;
      } else if (typeof item.images === 'object') {
        // Handle object format like {'0': {...}, '1': {...}}
        imageArray = Object.values(item.images);
      }

      const cloudFrontUrl = process.env.CLOUDFRONT_URL || 'https://d13sqx61nhrgy0.cloudfront.net';

      images = imageArray.map(img => {
        // Handle DynamoDB Map format
        const imgData = img.M || img;
        const path = imgData.path?.S || imgData.path;
        const publicId = imgData.public_id?.S || imgData.public_id;

        // Reconstruct full URL from CloudFront + path
        const url = path && path.startsWith('/')
          ? `${cloudFrontUrl}${path}`
          : path; // Fallback to path if it's already a full URL

        return {
          public_id: publicId,
          url: url
        };
      });
    }

    return {
      _id: item.productId,
      name: item.name,
      price: item.price,
      description: item.description,
      ratings: item.ratings,
      numOfReviews: item.numOfReviews,
      stock: item.stock,
      seller: item.seller,
      category: item.category,
      images: images,
      user: item.userId,
      reviews: [], // Reviews sẽ được query riêng
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  /**
   * Get price range for indexing
   */
  _getPriceRange(price) {
    if (price < 100000) return '0-100000';
    if (price < 200000) return '100000-200000';
    if (price < 300000) return '200000-300000';
    if (price < 500000) return '300000-500000';
    return '500000+';
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Find product by ID
   */
  async findById(id) {
    const params = {
      TableName: this.tableName,
      Key: this._getProductKeys(id),
      ConsistentRead: true
    };

    const result = await this.dynamodb.get(params).promise();
    const product = this._transformFromDynamo(result.Item);

    if (product) {
      // Load reviews
      product.reviews = await this.getProductReviews(id);
    }

    return product;
  }

  /**
   * Find all products with filters
   */
  async findAll(filters = {}, options = {}) {
    const {
      keyword,
      category,
      price,
      ratings,
      page = 1,
      limit = 10,
      sortByPrice,
      ...otherFilters
    } = filters;

    let items = [];

    // ✅ STEP 1: Query ALL items first (without pagination)
    // This ensures we get accurate count for pagination calculation
    if (category) {
      items = await this._queryByCategory(category, 0, 1); // Get ALL items
    } else {
      items = await this._scanProducts(0, 1); // Get ALL items
    }

    // ✅ STEP 2: Apply filters to get filtered count
    const filteredItems = this._applyFilters(items, { keyword, price, ratings, ...otherFilters });

    // ✅ STEP 3: Sort
    if (sortByPrice) {
      const isAscending = sortByPrice === 'asc' || sortByPrice === '1' || sortByPrice === 1;
      filteredItems.sort((a, b) => isAscending ? a.price - b.price : b.price - a.price);
    }

    const totalCount = filteredItems.length;

    // ✅ STEP 4: Apply pagination
    let paginatedItems;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (limitNum === 0 || limitNum === '0' || isNaN(limitNum)) {
      // Return all items if limit is 0
      paginatedItems = filteredItems;
    } else {
      const startIndex = (pageNum - 1) * limitNum;
      paginatedItems = filteredItems.slice(startIndex, startIndex + limitNum);
    }

    const totalPages = (limitNum > 0 && !isNaN(limitNum))
      ? Math.ceil(totalCount / limitNum)
      : 1;

    return {
      products: paginatedItems.map(item => this._transformFromDynamo(item)),
      count: totalCount, // Total filtered count
      page: pageNum,
      pages: totalPages
    };
  }

  /**
   * Query products by category using GSI1
   * ✅ OPTIMIZED: Limit items early to reduce RCU consumption
   */
  async _queryByCategory(category, limit, page) {
    let items = [];
    let lastEvaluatedKey = null;

    console.log(`🔍 Querying category: "${category}"`);

    // ✅ Handle limit = 0 (get ALL items)
    const shouldGetAll = (limit === 0 || limit === '0');
    const maxItemsNeeded = shouldGetAll ? Infinity : (limit * page);

    // ✅ OPTIMIZATION: Stop querying when we have enough items
    do {
      const params = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :category',
        ExpressionAttributeValues: {
          ':category': `CATEGORY#${category}`
        },
        ScanIndexForward: false // Newest first
      };

      // Only set Limit if not getting all items
      if (!shouldGetAll) {
        params.Limit = Math.min(1000, maxItemsNeeded - items.length);
      }

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await this.dynamodb.query(params).promise();
      items = items.concat(result.Items);
      lastEvaluatedKey = result.LastEvaluatedKey;

      console.log(`📊 Query returned ${result.Items.length} items, total so far: ${items.length}`);

      // ✅ STOP EARLY when we have enough items (unless getting all)
      if (!shouldGetAll && items.length >= maxItemsNeeded) {
        break;
      }

      // ✅ STOP when no more items
      if (!lastEvaluatedKey) {
        break;
      }

    } while (true);

    console.log(`✅ Total items found for category "${category}": ${items.length}`);
    return items;
  }

  /**
   * Scan all products (fallback, expensive)
   * ✅ OPTIMIZED: Limit items early to reduce RCU consumption
   */
  async _scanProducts(limit, page, cursor = null) {
    let items = [];
    let lastEvaluatedKey = cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : null;

    // ✅ Handle limit = 0 (get ALL items)
    const shouldGetAll = (limit === 0 || limit === '0');
    const maxItemsNeeded = shouldGetAll ? Infinity : (limit * page);

    // ✅ OPTIMIZATION: Stop scanning when we have enough items
    do {
      const params = {
        TableName: this.tableName,
        FilterExpression: 'EntityType = :type',
        ExpressionAttributeValues: {
          ':type': 'Product'
        }
      };

      // Only set Limit if not getting all items
      if (!shouldGetAll) {
        params.Limit = Math.min(1000, maxItemsNeeded - items.length);
      }

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await this.dynamodb.scan(params).promise();
      items = items.concat(result.Items);
      lastEvaluatedKey = result.LastEvaluatedKey;

      // ✅ STOP EARLY when we have enough items (unless getting all)
      if (!shouldGetAll && items.length >= maxItemsNeeded) {
        break;
      }

      // ✅ STOP when no more items
      if (!lastEvaluatedKey) {
        break;
      }

    } while (true);

    return items;
  }

  /**
   * Helper function to remove Vietnamese accents
   */
  _removeVietnameseAccents(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  /**
   * Apply client-side filters
   */
  _applyFilters(items, filters) {
    let filtered = items;

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      const normalizedKeyword = this._removeVietnameseAccents(keyword);

      filtered = filtered.filter(item => {
        const name = item.name.toLowerCase();
        const description = item.description.toLowerCase();
        const normalizedName = this._removeVietnameseAccents(name);
        const normalizedDescription = this._removeVietnameseAccents(description);

        // Search in both original and normalized forms
        return name.includes(keyword) ||
          description.includes(keyword) ||
          normalizedName.includes(normalizedKeyword) ||
          normalizedDescription.includes(normalizedKeyword);
      });
    }

    if (filters.price) {
      const { gte, lte } = filters.price;
      if (gte) filtered = filtered.filter(item => item.price >= gte);
      if (lte) filtered = filtered.filter(item => item.price <= lte);
    }

    if (filters.ratings) {
      const { gte } = filters.ratings;
      if (gte) filtered = filtered.filter(item => item.ratings >= gte);
    }

    return filtered;
  }

  /**
   * Create new product
   */
  async create(productData, id = null) {
    const item = this._transformToDynamo(productData, id);

    const params = {
      TableName: this.tableName,
      Item: item
    };

    await this.dynamodb.put(params).promise();
    return this._transformFromDynamo(item);
  }

  /**
   * Update product by ID
   */
  async update(id, updateData) {
    const keys = this._getProductKeys(id);

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updateData).forEach((key, index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updateData[key];
    });

    // Always update timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: this.tableName,
      Key: keys,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await this.dynamodb.update(params).promise();
    return this._transformFromDynamo(result.Attributes);
  }

  /**
   * Delete product by ID
   */
  async delete(id) {
    const params = {
      TableName: this.tableName,
      Key: this._getProductKeys(id)
    };

    await this.dynamodb.delete(params).promise();
    return true;
  }

  /**
   * Search products
   */
  async search(keyword, options = {}) {
    const { limit = 10, page = 1 } = options;
    const result = await this.findAll({ keyword, limit, page });
    return result.products;
  }

  /**
   * Count products with filters
   */
  async count(filters = {}) {
    const result = await this.findAll(filters, { limit: 1000 });
    return result.count;
  }

  /**
   * Find products by category
   */
  async findByCategory(category, options = {}) {
    const { limit = 10, page = 1 } = options;
    const result = await this.findAll({ category, limit, page });
    return result.products;
  }

  /**
   * Update product stock (Atomic operation to prevent race conditions)
   * Uses DynamoDB's atomic counter and conditional expressions
   */
  async updateStock(id, quantity) {
    const keys = this._getProductKeys(id);

    try {
      let params;

      if (quantity >= 0) {
        // ✅ Adding stock - no pre-condition needed
        params = {
          TableName: this.tableName,
          Key: keys,
          UpdateExpression: 'SET stock = stock + :qty, updatedAt = :timestamp ADD #version :inc',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeNames: {
            '#version': 'version'
          },
          ExpressionAttributeValues: {
            ':qty': quantity,
            ':timestamp': new Date().toISOString(),
            ':inc': 1
          },
          ReturnValues: 'ALL_NEW'
        };
      } else {
        // ✅ Reducing stock - ensure stock is sufficient
        // DynamoDB doesn't support arithmetic in ConditionExpression, so check stock >= abs(quantity)
        const minRequired = Math.abs(quantity);
        params = {
          TableName: this.tableName,
          Key: keys,
          UpdateExpression: 'SET stock = stock + :qty, updatedAt = :timestamp ADD #version :inc',
          ConditionExpression: 'attribute_exists(PK) AND stock >= :minRequired',
          ExpressionAttributeNames: {
            '#version': 'version'
          },
          ExpressionAttributeValues: {
            ':qty': quantity,  // negative value
            ':minRequired': minRequired,
            ':timestamp': new Date().toISOString(),
            ':inc': 1
          },
          ReturnValues: 'ALL_NEW'
        };
      }

      const result = await this.dynamodb.update(params).promise();
      return this._transformFromDynamo(result.Attributes);

    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        // Check if product exists or stock insufficient
        const product = await this.findById(id);
        if (!product) {
          throw new Error('Product not found');
        }
        throw new Error('Insufficient stock - product may be out of stock or concurrent update occurred');
      }
      throw error;
    }
  }

  /**
   * Add review to product
   */
  async addReview(productId, review) {
    // In DynamoDB, reviews are separate items
    const reviewId = this._generateId();
    const timestamp = new Date().toISOString();

    const reviewItem = {
      PK: `PRODUCT#${productId}`,
      SK: `REVIEW#${review.user}`,
      GSI1PK: `USER#${review.user}`,
      GSI1SK: `REVIEW#${timestamp}`,
      EntityType: 'Review',
      reviewId,
      productId,
      userId: review.user,
      userName: review.name,
      rating: review.rating,
      comment: review.comment,
      createdAt: timestamp
    };

    await this.dynamodb.put({
      TableName: this.tableName,
      Item: reviewItem
    }).promise();

    // Update product ratings
    await this._updateProductRatings(productId);

    return this.findById(productId);
  }

  /**
   * Update product ratings based on reviews
   */
  async _updateProductRatings(productId) {
    const reviews = await this.getReviews(productId);

    const numOfReviews = reviews.length;
    const ratings = numOfReviews > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / numOfReviews
      : 0;

    await this.update(productId, { ratings, numOfReviews });
  }

  /**
   * Get product reviews
   */
  async getReviews(productId) {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PRODUCT#${productId}`,
        ':sk': 'REVIEW#'
      }
    };

    const result = await this.dynamodb.query(params).promise();

    return result.Items.map(item => ({
      _id: item.reviewId,
      user: item.userId,
      name: item.userName,
      rating: item.rating,
      comment: item.comment,
      createdAt: item.createdAt
    }));
  }

  /**
   * Delete review
   */
  async deleteReview(productId, reviewId) {
    // Find review by reviewId
    const reviews = await this.getReviews(productId);
    const review = reviews.find(r => r._id === reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    const params = {
      TableName: this.tableName,
      Key: {
        PK: `PRODUCT#${productId}`,
        SK: `REVIEW#${review.user}`
      }
    };

    await this.dynamodb.delete(params).promise();

    // Update product ratings
    await this._updateProductRatings(productId);

    return this.findById(productId);
  }

  /**
   * Get related products (same category)
   */
  async getRelatedProducts(productId, limit = 6) {
    try {
      const product = await this.findById(productId);

      if (!product) {
        return [];
      }

      // Query products in same category
      const params = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :category',
        ExpressionAttributeValues: {
          ':category': `CATEGORY#${product.category}`
        },
        Limit: limit + 5 // Get more to filter out current product
      };

      const result = await this.dynamodb.query(params).promise();

      // Filter out current product and transform
      const relatedProducts = result.Items
        .filter(item => item.productId !== productId)
        .slice(0, limit)
        .map(item => this._transformFromDynamo(item));

      return relatedProducts;
    } catch (error) {
      console.error('Error getting related products:', error);
      return [];
    }
  }

  /**
   * Get best sellers
   */
  async getBestSellers(limit = 10, category = null) {
    try {
      let items = [];

      if (category) {
        // Get products by category
        const params = {
          TableName: this.tableName,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :category',
          ExpressionAttributeValues: {
            ':category': `CATEGORY#${category}`
          }
        };
        const result = await this.dynamodb.query(params).promise();
        items = result.Items;
      } else {
        // Scan all products
        items = await this._scanProducts(0, 1);
      }

      // Sort by numOfReviews and ratings (proxy for best sellers)
      const sortedProducts = items
        .sort((a, b) => {
          // Primary sort: number of reviews
          if (b.numOfReviews !== a.numOfReviews) {
            return b.numOfReviews - a.numOfReviews;
          }
          // Secondary sort: ratings
          return b.ratings - a.ratings;
        })
        .slice(0, limit)
        .map(item => this._transformFromDynamo(item));

      return sortedProducts;
    } catch (error) {
      console.error('Error getting best sellers:', error);
      return [];
    }
  }

  /**
   * Get products by IDs (for recently viewed)
   */
  async getProductsByIds(productIds) {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      const products = await Promise.all(
        productIds.map(id => this.findById(id).catch(() => null))
      );

      // Filter out null values (products not found)
      return products.filter(p => p !== null);
    } catch (error) {
      console.error('Error getting products by IDs:', error);
      return [];
    }
  }

  /**
   * Get all reviews for a product
   */
  async getProductReviews(productId) {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `PRODUCT#${productId}`,
        ':sk': 'REVIEW#'
      }
    };

    const result = await this.dynamodb.query(params).promise();

    return result.Items.map(item => ({
      user: item.userId,
      name: item.userName || 'Anonymous',
      rating: item.rating,
      comment: item.comment,
      createdAt: item.createdAt
    }));
  }

  /**
   * Delete all products for a specific user (for test cleanup)
   */
  async deleteProductsByUser(userId) {
    // Query all products by this user
    const params = {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :userId',
      ExpressionAttributeValues: {
        ':userId': `USER#${userId}`
      }
    };

    const result = await this.dynamodb.query(params).promise();

    // Delete each product and its reviews
    for (const item of result.Items) {
      if (item.EntityType === 'Product') {
        const productId = item.productId;

        // Delete product reviews first
        const reviewParams = {
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `PRODUCT#${productId}`,
            ':sk': 'REVIEW#'
          }
        };

        const reviews = await this.dynamodb.query(reviewParams).promise();
        for (const review of reviews.Items) {
          await this.dynamodb.delete({
            TableName: this.tableName,
            Key: { PK: review.PK, SK: review.SK }
          }).promise();
        }

        // Delete product metadata
        await this.dynamodb.delete({
          TableName: this.tableName,
          Key: this._getProductKeys(productId)
        }).promise();
      }
    }

    return true;
  }

  /**
   * ✅ NEW: Cursor-based pagination for products
   * More efficient than page-based pagination
   * @param {Object} filters - Search filters
   * @param {number} limit - Items per request
   * @param {string} cursor - Base64 encoded cursor
   * @returns {Object} { products, nextCursor, hasMore }
   */
  async findAllWithCursor(filters = {}, limit = 20, cursor = null) {
    const {
      keyword,
      category,
      price,
      ratings,
      sortByPrice
    } = filters;

    let exclusiveStartKey = null;
    if (cursor) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString());
      } catch (error) {
        console.error('Invalid cursor:', error.message);
      }
    }

    let items = [];
    let lastEvaluatedKey = null;

    // Query by category if provided
    if (category) {
      const params = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :category',
        ExpressionAttributeValues: {
          ':category': `CATEGORY#${category}`
        },
        ScanIndexForward: false,
        Limit: limit
      };

      if (exclusiveStartKey) {
        params.ExclusiveStartKey = exclusiveStartKey;
      }

      const result = await this.dynamodb.query(params).promise();
      items = result.Items;
      lastEvaluatedKey = result.LastEvaluatedKey;
    } else {
      // Scan all products
      const params = {
        TableName: this.tableName,
        FilterExpression: 'EntityType = :type',
        ExpressionAttributeValues: {
          ':type': 'Product'
        },
        Limit: limit * 2 // Get more to allow for filtering
      };

      if (exclusiveStartKey) {
        params.ExclusiveStartKey = exclusiveStartKey;
      }

      const result = await this.dynamodb.scan(params).promise();
      items = result.Items;
      lastEvaluatedKey = result.LastEvaluatedKey;
    }

    // Apply client-side filters
    items = this._applyFilters(items, { keyword, price, ratings });

    // Sort
    if (sortByPrice) {
      const isAscending = sortByPrice === 'asc' || sortByPrice === '1' || sortByPrice === 1;
      items.sort((a, b) => isAscending ? a.price - b.price : b.price - a.price);
    }

    // Take only limit items (after filtering)
    const resultItems = items.slice(0, limit);

    // Generate next cursor if there are more items
    const nextCursor = lastEvaluatedKey
      ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
      : null;

    return {
      products: resultItems.map(item => this._transformFromDynamo(item)),
      nextCursor,
      hasMore: !!lastEvaluatedKey || items.length > limit
    };
  }
}

module.exports = DynamoProductRepository;
