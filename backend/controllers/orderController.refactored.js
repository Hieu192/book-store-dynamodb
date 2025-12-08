/**
 * Order Controller (Refactored)
 * Uses OrderService and ProductService instead of direct Model access
 * ✅ WITH ROLLBACK LOGIC for order creation
 */

const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const orderService = require('../services/OrderService');
const productService = require('../services/ProductService');
const { notifyOrderCreated, notifyOrderUpdated, notifyOrderDelivered } = require('../utils/notifications');

/**
 * Helper function to rollback stock reductions
 * @param {Array} stockReductions - Array of {productId, quantity, name}
 */
async function rollbackStock(stockReductions) {
  console.log(`🔄 Attempting to rollback ${stockReductions.length} stock reduction(s)...`);

  const rollbackPromises = stockReductions.map(({ productId, quantity, name }) => {
    return productService.updateStock(productId, quantity)  // Add back (positive)
      .then(() => {
        console.log(`✅ Rolled back stock for ${name}: +${quantity}`);
        return { success: true, productId, name };
      })
      .catch((error) => {
        console.error(`❌ Rollback failed for ${name}:`, error.message);
        return { success: false, productId, name, error: error.message };
      });
  });

  const results = await Promise.all(rollbackPromises);

  // Check if any rollback failed
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.error('⚠️  Some rollbacks failed:', failures);
    throw new Error(`Failed to rollback stock for ${failures.length} products`);
  }

  console.log('✅ All stock rollbacks completed successfully');
  return results;
}

// Create a new order => /api/v1/order/new
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  const {
    orderCode,
    orderItems,
    shippingInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paymentInfo,
  } = req.body;

  // Track products with reduced stock for potential rollback
  const stockReductions = [];
  let stockReduced = false;

  try {
    // ✅ STEP 1: Validate and reduce stock for all items
    console.log(`📦 Reducing stock for ${orderItems.length} order items...`);

    for (const item of orderItems) {
      try {
        // Reduce stock atomically (negative quantity)
        await productService.updateStock(item.product, -item.quantity);

        // Track successful reduction for potential rollback
        stockReductions.push({
          productId: item.product,
          quantity: item.quantity,
          name: item.name || 'Unknown Product'
        });

        console.log(`✅ Stock reduced for ${item.name}: -${item.quantity}`);
      } catch (stockError) {
        // Stock reduction failed (insufficient stock or product not found)
        console.error(`❌ Stock reduction failed for ${item.name}:`, stockError.message);

        // Rollback any successful stock reductions before this failure
        if (stockReductions.length > 0) {
          console.log('🔄 Rolling back previous stock reductions...');
          await rollbackStock(stockReductions);
        }

        // Return error to user
        return next(new ErrorHandler(
          stockError.message || `Failed to reduce stock for ${item.name}`,
          400
        ));
      }
    }

    stockReduced = true;
    console.log(`✅ All stock reduced successfully (${stockReductions.length} items)`);

    // ✅ STEP 2: Create order in database
    console.log('📝 Creating order in database...');

    const orderData = {
      orderCode,
      orderItems,
      shippingInfo,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      paymentInfo,
      user: req.user._id || req.user.id,
    };

    const order = await orderService.createOrder(orderData);
    console.log(`✅ Order created successfully: ${order._id || order.id}`);

    // ✅ STEP 3: Send notification (non-critical, failures are logged only)
    try {
      notifyOrderCreated(req.user.id, order);
    } catch (notificationError) {
      // Log but don't fail the request
      console.log('⚠️  Notification error (non-critical):', notificationError.message);
    }

    // Success response
    res.status(200).json({
      success: true,
      order,
    });

  } catch (error) {
    // ❌ STEP 2 FAILED: Order creation failed after stock reduction
    console.error('❌ Order creation failed:', error.message);

    if (stockReduced && stockReductions.length > 0) {
      // Rollback all stock reductions
      console.log('🔄 Rolling back stock reductions due to order creation failure...');

      try {
        await rollbackStock(stockReductions);
        console.log('✅ Stock rollback completed successfully');

        // Return error with rollback notification
        return next(new ErrorHandler(
          `Order creation failed. Stock has been restored. Error: ${error.message}`,
          500
        ));
      } catch (rollbackError) {
        // CRITICAL: Rollback also failed
        console.error('🚨 CRITICAL: Stock rollback failed!', rollbackError.message);
        console.error('🚨 Manual intervention required for products:', stockReductions);

        // Alert system administrators
        // TODO: Send alert to monitoring system (e.g., Sentry, CloudWatch, PagerDuty)

        return next(new ErrorHandler(
          `CRITICAL ERROR: Order creation failed AND stock rollback failed. Please contact support immediately. Order Code: ${orderCode}`,
          500
        ));
      }
    }

    // Stock was not reduced, just return the error
    return next(new ErrorHandler(error.message || 'Failed to create order', 500));
  }
});

// Get single order => /api/v1/order/:id
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await orderService.getOrder(req.params.id);

  if (!order) {
    return next(new ErrorHandler("No Order found with this ID", 404));
  }

  res.status(200).json({
    success: true,
    order,
  });
});

// Get logged in user orders => /api/v1/orders/me
exports.myOrders = catchAsyncErrors(async (req, res) => {
  const orders = await orderService.getMyOrders(req.user.id);

  res.status(200).json({
    success: true,
    orders,
  });
});

// Get all orders - ADMIN => /api/v1/admin/orders/
exports.allOrders = catchAsyncErrors(async (req, res) => {
  const orders = await orderService.getAllOrders();

  let totalAmount = 0;
  orders.forEach((order) => {
    totalAmount += order.totalPrice;
  });

  res.status(200).json({
    success: true,
    totalAmount,
    orders,
  });
});

// Update / Process order - ADMIN => /api/v1/admin/order/:id
exports.updateOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await orderService.getOrder(req.params.id);

  if (!order) {
    return next(new ErrorHandler("No Order found with this ID", 404));
  }

  if (order.orderStatus === "Delivered") {
    return next(new ErrorHandler("You have already delivered this order", 400));
  }

  // ✅ REMOVED: Stock update logic (stock reduced at order creation)
  // Stock should NOT be updated here - it's already reduced when order was created

  // Update order status
  const updateData = {
    orderStatus: req.body.status,
    deliveredAt: req.body.status === 'Delivered' ? Date.now() : undefined
  };

  await orderService.updateOrder(req.params.id, updateData);

  // Get updated order for notification
  const updatedOrder = await orderService.getOrder(req.params.id);

  // Send real-time notification
  try {
    // Handle both string and object user IDs
    const userId = typeof updatedOrder.user === 'string' ? updatedOrder.user : (updatedOrder.user._id || updatedOrder.user.id || updatedOrder.user.toString());

    if (req.body.status === 'Delivered') {
      notifyOrderDelivered(userId, updatedOrder);
    } else {
      notifyOrderUpdated(userId, updatedOrder);
    }
  } catch (error) {
    // Ignore notification errors in test environment
    console.log('⚠️  Notification error (may be expected in tests):', error.message);
  }

  res.status(200).json({
    success: true,
  });
});

// Delete order => /api/v1/admin/order/:id
exports.deleteOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await orderService.getOrder(req.params.id);

  if (!order) {
    return next(new ErrorHandler("No Order found with this ID", 404));
  }

  await orderService.deleteOrder(req.params.id);

  res.status(200).json({
    success: true,
  });
});
