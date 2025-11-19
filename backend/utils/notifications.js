/**
 * Notification Helper
 * Send real-time notifications via WebSocket
 */

const { sendNotification, sendAdminNotification } = require('../config/websocket');

/**
 * Notification types
 */
const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_DELIVERED: 'order_delivered',
  REVIEW_ADDED: 'review_added',
  PRODUCT_LOW_STOCK: 'product_low_stock',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed'
};

/**
 * Send order created notification
 */
const notifyOrderCreated = (userId, order) => {
  const notification = {
    type: NOTIFICATION_TYPES.ORDER_CREATED,
    title: 'Đơn hàng mới',
    message: `Đơn hàng #${order.orderCode} đã được tạo thành công`,
    data: {
      orderId: order._id || order.id,
      orderCode: order.orderCode,
      totalPrice: order.totalPrice
    }
  };

  // Send to user
  sendNotification(userId, notification);

  // Notify admin
  sendAdminNotification({
    type: NOTIFICATION_TYPES.ORDER_CREATED,
    title: 'Đơn hàng mới',
    message: `Có đơn hàng mới #${order.orderCode}`,
    data: {
      orderId: order._id || order.id,
      orderCode: order.orderCode,
      totalPrice: order.totalPrice,
      userId
    }
  });
};

/**
 * Send order status updated notification
 */
const notifyOrderUpdated = (userId, order) => {
  const notification = {
    type: NOTIFICATION_TYPES.ORDER_UPDATED,
    title: 'Cập nhật đơn hàng',
    message: `Đơn hàng #${order.orderCode} đã được cập nhật: ${order.orderStatus}`,
    data: {
      orderId: order._id || order.id,
      orderCode: order.orderCode,
      status: order.orderStatus
    }
  };

  sendNotification(userId, notification);
};

/**
 * Send order delivered notification
 */
const notifyOrderDelivered = (userId, order) => {
  const notification = {
    type: NOTIFICATION_TYPES.ORDER_DELIVERED,
    title: 'Đơn hàng đã giao',
    message: `Đơn hàng #${order.orderCode} đã được giao thành công`,
    data: {
      orderId: order._id || order.id,
      orderCode: order.orderCode
    }
  };

  sendNotification(userId, notification);
};

/**
 * Send review added notification
 */
const notifyReviewAdded = (productOwnerId, review, productName) => {
  const notification = {
    type: NOTIFICATION_TYPES.REVIEW_ADDED,
    title: 'Đánh giá mới',
    message: `Sản phẩm "${productName}" có đánh giá mới: ${review.rating} sao`,
    data: {
      productId: review.productId,
      rating: review.rating,
      comment: review.comment
    }
  };

  sendNotification(productOwnerId, notification);
};

/**
 * Send low stock notification to admin
 */
const notifyLowStock = (product) => {
  const notification = {
    type: NOTIFICATION_TYPES.PRODUCT_LOW_STOCK,
    title: 'Cảnh báo tồn kho',
    message: `Sản phẩm "${product.name}" sắp hết hàng (còn ${product.stock})`,
    data: {
      productId: product._id || product.id,
      productName: product.name,
      stock: product.stock
    }
  };

  sendAdminNotification(notification);
};

/**
 * Send payment success notification
 */
const notifyPaymentSuccess = (userId, order) => {
  const notification = {
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title: 'Thanh toán thành công',
    message: `Thanh toán cho đơn hàng #${order.orderCode} đã thành công`,
    data: {
      orderId: order._id || order.id,
      orderCode: order.orderCode,
      amount: order.totalPrice
    }
  };

  sendNotification(userId, notification);
};

/**
 * Send payment failed notification
 */
const notifyPaymentFailed = (userId, order) => {
  const notification = {
    type: NOTIFICATION_TYPES.PAYMENT_FAILED,
    title: 'Thanh toán thất bại',
    message: `Thanh toán cho đơn hàng #${order.orderCode} không thành công`,
    data: {
      orderId: order._id || order.id,
      orderCode: order.orderCode
    }
  };

  sendNotification(userId, notification);
};

module.exports = {
  NOTIFICATION_TYPES,
  notifyOrderCreated,
  notifyOrderUpdated,
  notifyOrderDelivered,
  notifyReviewAdded,
  notifyLowStock,
  notifyPaymentSuccess,
  notifyPaymentFailed
};
