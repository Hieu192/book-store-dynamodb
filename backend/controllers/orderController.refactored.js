/**
 * Order Controller (Refactored)
 * Uses OrderService and ProductService instead of direct Model access
 */

const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const orderService = require('../services/OrderService');
const productService = require('../services/ProductService');

// Create a new order => /api/v1/order/new
exports.newOrder = catchAsyncErrors(async (req, res) => {
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

  // Update stock for all order items using Promise.all
  await Promise.all(
    order.orderItems.map(async (item) => {
      await updateStock(item.product, item.quantity);
    })
  );

  // Update order status
  const updateData = {
    orderStatus: req.body.status,
    deliveredAt: Date.now()
  };

  await orderService.updateOrder(req.params.id, updateData);

  res.status(200).json({
    success: true,
  });
});

// Helper function to update product stock
async function updateStock(productId, quantity) {
  const product = await productService.getProduct(productId);

  if (product) {
    const newStock = product.stock - quantity;
    await productService.updateProduct(productId, { stock: newStock });
  }
}

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
