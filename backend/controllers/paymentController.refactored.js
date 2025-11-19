/**
 * Payment Controller (Refactored)
 * Uses OrderService instead of direct Model access
 */

const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const PayOS = require("@payos/node");
const orderService = require('../services/OrderService');

// Initialize PayOS with environment variables
const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// Receive payment webhook => /api/v1/payment/webhook
exports.receiveHookPayment = catchAsyncErrors(async (req, res) => {
    const { data, success } = req.body;
    const { orderCode, amount } = data;
    
    // Find order by orderCode
    const orders = await orderService.getAllOrders();
    const order = orders.find(o => o.orderCode === orderCode);
    
    if (order) {
        // Verify amount and update payment status
        if (Number(amount) === order.totalPrice && success) {
            await orderService.updateOrder(order.id || order._id, {
                paidAt: Date.now()
            });
        }
        res.status(200).json({ success: true });
    } else {
        res.json({});
    }
});

// Create payment link => /api/v1/payment/process
exports.createPaymentLink = catchAsyncErrors(async (req, res, next) => {
    const { orderCode, totalPrice } = req.body;
    
    const body = {
        orderCode,
        amount: totalPrice,
        description: "Thanh toan don hang",
        cancelUrl: `${process.env.FRONTEND_URL}/cart`,
        returnUrl: process.env.FRONTEND_URL
    };
    
    try {
        const { checkoutUrl } = await payOS.createPaymentLink(body);
        
        // Update order with checkout URL
        const orders = await orderService.getAllOrders();
        const order = orders.find(o => o.orderCode === orderCode);
        
        if (order) {
            await orderService.updateOrder(order.id || order._id, {
                checkoutUrl
            });
        }
        
        res.status(200).json({
            success: true,
            checkoutUrl
        });
    } catch (err) {
        console.error('PayOS Error:', err);
        return next(new ErrorHandler('Payment link creation failed', 500));
    }
});
