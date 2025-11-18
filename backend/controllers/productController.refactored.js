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
  const result = await productService.getProducts(req.query);

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
    const product = await productService.getProduct(req.params.id);

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
