const express = require('express')
const router = express.Router();


const {
    getProducts,
    getAdminProducts,
    newProduct,
    getSingleProduct,
    updateProduct,
    deleteProduct,
    createProductReview,
    getProductReviews,
    deleteReview,
    getRelatedProducts,
    getBestSellers,
    getProductsByIds,
    trackProductView,
    getAlsoViewed,
    getFrequentlyBoughtTogether,
    seedRecommendations

} = require('../controllers/productController.refactored')

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const { cache, invalidateCache } = require('../middlewares/cache');

// Development route for seeding data
router.route('/dev/seed-recommendations').post(seedRecommendations);

// Recommendation routes (MUST be before /products and /product/:id to avoid conflicts)
router.route('/products/bestsellers').get(cache(600), getBestSellers); // Cache 10 minutes
router.route('/products/by-ids').get(cache(300), getProductsByIds);

// Public routes with cache (5 minutes)
router.route('/products').get(cache(300), getProducts);

// Product detail and related (specific routes before generic :id)
router.route('/product/:id/related').get(cache(600), getRelatedProducts);
router.route('/product/:id/also-viewed').get(cache(300), getAlsoViewed);
router.route('/product/:id/bought-together').get(cache(600), getFrequentlyBoughtTogether);
router.route('/product/:id/view').post(trackProductView);
router.route('/product/:id').get(cache(300), getSingleProduct);

// Admin routes
router.route('/admin/products').get(isAuthenticatedUser, authorizeRoles('admin'), getAdminProducts);

router.route('/admin/product/new').post(
    isAuthenticatedUser, 
    authorizeRoles('admin'), 
    invalidateCache(['cache:*products*', 'cache:*product*']),
    newProduct
);

router.route('/admin/product/:id')
    .put(
        isAuthenticatedUser, 
        authorizeRoles('admin'), 
        invalidateCache(['cache:*products*', 'cache:*product*']),
        updateProduct
    )
    .delete(
        isAuthenticatedUser, 
        authorizeRoles('admin'), 
        invalidateCache(['cache:*products*', 'cache:*product*']),
        deleteProduct
    );


// Review routes
router.route('/review').put(
    isAuthenticatedUser, 
    invalidateCache(['cache:*product*', 'cache:*reviews*']),
    createProductReview
);
router.route('/reviews').get(isAuthenticatedUser, cache(300), getProductReviews);
router.route('/reviews').delete(
    isAuthenticatedUser, 
    invalidateCache(['cache:*product*', 'cache:*reviews*']),
    deleteReview
);

module.exports = router;