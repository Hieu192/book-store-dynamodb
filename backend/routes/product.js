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
    deleteReview

} = require('../controllers/productController.refactored')

const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');
const { cache, invalidateCache } = require('../middlewares/cache');

// Public routes with cache (5 minutes)
router.route('/products').get(cache(300), getProducts);
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