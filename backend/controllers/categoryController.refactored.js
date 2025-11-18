/**
 * Category Controller (Refactored)
 * Sử dụng Service layer
 */

const categoryService = require('../services/CategoryService');
const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const { uploadMultipleImages } = require('../utils/s3Upload');

// Get all categories => /api/v1/category
exports.getCategory = catchAsyncErrors(async (req, res, next) => {
  const categories = await categoryService.getCategories();

  res.status(200).json({
    success: true,
    category: categories
  });
});

// Create new category => /api/v1/admin/category/new
exports.newCategory = catchAsyncErrors(async (req, res, next) => {
  try {
    // Handle image upload
    let images = [];
    if (typeof req.body.images === "string") {
      images.push(req.body.images);
    } else if (req.body.images) {
      images = req.body.images;
    }

    // Upload images to S3
    const imagesLinks = await uploadMultipleImages(images, "categories");
    req.body.images = imagesLinks;

    const category = await categoryService.createCategory(req.body);

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update category => /api/v1/admin/category/:id
exports.updateCategory = catchAsyncErrors(async (req, res, next) => {
  try {
    // Handle image upload if new images provided
    if (req.body.images) {
      let images = [];
      if (typeof req.body.images === "string") {
        images.push(req.body.images);
      } else {
        images = req.body.images;
      }

      // Upload images to S3
      const imagesLinks = await uploadMultipleImages(images, "categories");
      req.body.images = imagesLinks;
    }

    const category = await categoryService.updateCategory(req.params.id, req.body);

    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
});

// Delete category => /api/v1/movies/:genreID
exports.deleteCategory = catchAsyncErrors(async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.genreID);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    // If it's a CastError, pass the original error to middleware
    if (error.name === 'CastError') {
      return next(error);
    }
    return next(new ErrorHandler(error.message, 404));
  }
});
