/**
 * Product Controller (Refactored)
 * Sử dụng Service layer thay vì trực tiếp gọi Model
 * Dễ dàng switch database mà không cần thay đổi controller
 */

const productService = require('../services/ProductService');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');

// Get all products => /api/v1/products
exports.getProducts = catchAsyncErrors(async (req, res, next) => {
  // Parse query params for filters
  const filters = { ...req.query };

  // Parse category[] array to single category (take first one for now)
  // Frontend sends category[] but backend DynamoDB repository expects single category
  if (req.query['category[]']) {
    const categories = Array.isArray(req.query['category[]'])
      ? req.query['category[]']
      : [req.query['category[]']];

    // For now, only support single category filtering (first selected category)
    if (categories.length > 0) {
      filters.category = categories[0];
    }
    delete filters['category[]'];
  }

  // Parse price[gte], price[lte] to { price: { gte, lte } }
  if (req.query['price[gte]'] || req.query['price[lte]']) {
    filters.price = {};
    if (req.query['price[gte]']) {
      filters.price.gte = parseFloat(req.query['price[gte]']);
      delete filters['price[gte]'];
    }
    if (req.query['price[lte]']) {
      filters.price.lte = parseFloat(req.query['price[lte]']);
      delete filters['price[lte]'];
    }
  }

  // Parse ratings[gte] to { ratings: { gte } }
  if (req.query['ratings[gte]']) {
    filters.ratings = { gte: parseFloat(req.query['ratings[gte]']) };
    delete filters['ratings[gte]'];
  }

  console.log('📊 Product filters:', JSON.stringify(filters, null, 2));

  const result = await productService.getProducts(filters);

  console.log(`📦 Found ${result.products.length} products (page ${result.page}/${result.pages})`);

  res.status(200).json({
    success: true,
    productsCount: result.count, // Tổng số products (cho pagination)
    resPerPage: parseInt(req.query.limit) || 10,
    filteredProductsCount: result.products.length, // Số products trong page hiện tại
    products: result.products,
    currentPage: result.page,
    totalPages: result.pages
  });
});

// Get single product => /api/v1/product/:id
exports.getSingleProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    const productId = req.params.id;

    // Validate ID format
    if (!productId || productId.length < 10 || /[^a-zA-Z0-9]/.test(productId)) {
      return next(new ErrorHandler('Invalid product ID format', 400));
    }

    const product = await productService.getProduct(productId);

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    // If it's a CastError, pass the original error to middleware
    if (error.name === 'CastError') {
      return next(error);
    }
    return next(new ErrorHandler(error.message, 404));
  }
});

// Create new product => /api/v1/admin/product/new
exports.newProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    // Handle image upload
    let images = [];
    if (typeof req.body.images === "string") {
      images.push(req.body.images);
    } else if (req.body.images) {
      images = req.body.images;
    }

    let imagesLinks = [];
    const { uploadMultipleImages } = require("../utils/s3Upload");

    // Upload images to S3
    imagesLinks = await uploadMultipleImages(images, "products");

    req.body.images = imagesLinks;

    const product = await productService.createProduct(req.body, req.user.id);

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update product => /api/v1/admin/product/:id
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    // Handle image upload if new images provided
    if (req.body.images) {
      let images = [];
      if (typeof req.body.images === "string") {
        images.push(req.body.images);
      } else {
        images = req.body.images;
      }

      let imagesLinks = [];
      const { uploadMultipleImages } = require("../utils/s3Upload");

      // Upload images to S3
      imagesLinks = await uploadMultipleImages(images, "products");

      req.body.images = imagesLinks;
    }

    const product = await productService.updateProduct(req.params.id, req.body);

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
});

// Delete product => /api/v1/admin/product/:id
exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product is deleted.'
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
});

// Create new review => /api/v1/review
exports.createProductReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, productId } = req.body;

  const reviewData = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment
  };

  try {
    await productService.createReview(productId, reviewData);

    res.status(200).json({
      success: true
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get product reviews => /api/v1/reviews
exports.getProductReviews = catchAsyncErrors(async (req, res, next) => {
  try {
    const reviews = await productService.getReviews(req.query.id);

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
});

// Delete product review => /api/v1/reviews
exports.deleteReview = catchAsyncErrors(async (req, res, next) => {
  try {
    await productService.deleteReview(req.query.productId, req.query.id);

    res.status(200).json({
      success: true
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
});

// Get admin products => /api/v1/admin/products
exports.getAdminProducts = catchAsyncErrors(async (req, res, next) => {
  // Admin gets all products without pagination
  const result = await productService.getProducts({ limit: 0 });

  res.status(200).json({
    success: true,
    products: result.products
  });
});

// Get Related Products   =>   /api/v1/products/:id/related
exports.getRelatedProducts = catchAsyncErrors(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 6;
  const products = await productService.getRelatedProducts(req.params.id, limit);

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// Get Best Sellers   =>   /api/v1/products/bestsellers
exports.getBestSellers = catchAsyncErrors(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const category = req.query.category || null;
  const products = await productService.getBestSellers(limit, category);

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// Get Products by IDs   =>   /api/v1/products/by-ids
exports.getProductsByIds = catchAsyncErrors(async (req, res, next) => {
  const ids = req.query.ids ? req.query.ids.split(',') : [];
  const products = await productService.getProductsByIds(ids);

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// Track Product View   =>   /api/v1/product/:id/view
exports.trackProductView = catchAsyncErrors(async (req, res, next) => {
  const viewTracker = require('../utils/viewTracker');
  const sessionId = req.sessionID || req.headers['x-session-id'] || req.ip;

  viewTracker.trackView(sessionId, req.params.id);

  res.status(200).json({
    success: true,
    message: 'View tracked'
  });
});

// Get Customers Also Viewed   =>   /api/v1/product/:id/also-viewed
exports.getAlsoViewed = catchAsyncErrors(async (req, res, next) => {
  const viewTracker = require('../utils/viewTracker');
  const limit = parseInt(req.query.limit) || 6;

  const alsoViewedData = viewTracker.getAlsoViewed(req.params.id, limit);
  const productIds = alsoViewedData.map(item => item.productId);

  // Get actual product data
  const products = await productService.getProductsByIds(productIds);

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// Get Frequently Bought Together   =>   /api/v1/product/:id/bought-together
exports.getFrequentlyBoughtTogether = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const limit = parseInt(req.query.limit) || 3;

  // Get orders containing this product
  const orderService = require('../services/OrderService');
  const orders = await orderService.getOrdersContainingProduct(productId);

  // Count product co-occurrences
  const productCounts = {};

  orders.forEach(order => {
    order.orderItems.forEach(item => {
      if (item.product.toString() !== productId) {
        const id = item.product.toString();
        productCounts[id] = (productCounts[id] || 0) + 1;
      }
    });
  });

  // Sort by frequency and get top N
  const topProductIds = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => id);

  // Get actual product data
  const products = await productService.getProductsByIds(topProductIds);

  res.status(200).json({
    success: true,
    count: products.length,
    products,
    totalOrders: orders.length
  });
});

// Seed Recommendation Data (Development only)   =>   /api/v1/dev/seed-recommendations
exports.seedRecommendations = catchAsyncErrors(async (req, res, next) => {
  if (process.env.NODE_ENV === 'PRODUCTION') {
    return next(new ErrorHandler('Not available in production', 403));
  }

  const viewTracker = require('../utils/viewTracker');

  // Mock sessions
  const mockSessions = [
    { sessionId: 'session-001', views: ['662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e', '662d0a5fc3eea4473ccf692f'] },
    { sessionId: 'session-002', views: ['662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e', '662d0a2fc3eea4473ccf692d'] },
    { sessionId: 'session-003', views: ['662d0a76c3eea4473ccf6930', '662d0a5fc3eea4473ccf692f', '662d0a2fc3eea4473ccf692d'] },
    { sessionId: 'session-004', views: ['662d0a49c3eea4473ccf692e', '662d0a76c3eea4473ccf6930', '662d0a5fc3eea4473ccf692f'] },
    { sessionId: 'session-005', views: ['662d0a5fc3eea4473ccf692f', '662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e'] },
    { sessionId: 'session-006', views: ['662d0a2fc3eea4473ccf692d', '662d0a76c3eea4473ccf6930'] },
    { sessionId: 'session-007', views: ['662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e'] },
    { sessionId: 'session-008', views: ['662d0a49c3eea4473ccf692e', '662d0a5fc3eea4473ccf692f', '662d0a76c3eea4473ccf6930'] },
    { sessionId: 'session-009', views: ['662d0a76c3eea4473ccf6930', '662d0a2fc3eea4473ccf692d', '662d0a49c3eea4473ccf692e'] },
    { sessionId: 'session-010', views: ['662d0a5fc3eea4473ccf692f', '662d0a2fc3eea4473ccf692d', '662d0a76c3eea4473ccf6930'] }
  ];

  // Track all views
  mockSessions.forEach(session => {
    session.views.forEach(productId => {
      viewTracker.trackView(session.sessionId, productId);
    });
  });

  const stats = viewTracker.getStats();

  res.status(200).json({
    success: true,
    message: 'Recommendation data seeded',
    stats: stats,
    mockSessions: mockSessions.length
  });
});
