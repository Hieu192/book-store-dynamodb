/**
 * Order Controller (Refactored)
 * Uses OrderService and ProductService instead of direct Model access
 */

const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const orderService = require('../services/OrderService');
const productService = require('../services/ProductService');
const { notifyOrderCreated, notifyOrderUpdated, notifyOrderDelivered } = require('../utils/notifications');

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

  // ✅ FIX: Reduce stock WHEN ORDER IS CREATED, not when delivered
  try {
    // Validate and reduce stock for all items
    await Promise.all(
      orderItems.map(async (item) => {
        // Reduce stock (negative quantity)
        await productService.updateStock(item.product, -item.quantity);
      })
    );
  } catch (error) {
    // If stock reduction fails, return error immediately
    return next(new ErrorHandler(error.message || 'Failed to update stock', 400));
  }

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

  // Send real-time notification
  notifyOrderCreated(req.user.id, order);

  res.status(200).json({
    success: true,
    order,
  });
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
  if (req.body.status === 'Delivered') {
    notifyOrderDelivered(updatedOrder.user.toString(), updatedOrder);
  } else {
    notifyOrderUpdated(updatedOrder.user.toString(), updatedOrder);
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
