const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const PayOS = require("@payos/node");
const Order = require("../models/order");

// Initialize PayOS with environment variables
const payOS = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);
// Process payments   =>   /api/v1/payment/process
exports.receiveHookPayment = catchAsyncErrors(async (req, res, next) => {
    const {data,success} = req.body;
    const {orderCode,amount}=data
    const donhang=await Order.findOne({orderCode})
    if(donhang){
    if(Number(amount)===donhang.totalPrice && success ){
      await Order.updateOne({orderCode},{paidAt:Date.now()})
    }
      res.status(200).json({success:true}) }
    else res.json({})
})
exports.createPaymentLink = catchAsyncErrors(async (req, res, next) => {
    const {orderCode, totalPrice} = req.body;
    
    const body = {
        orderCode,
        amount: totalPrice,
        description: "Thanh toan don hang",
        cancelUrl: `${process.env.FRONTEND_URL}/cart`,
        returnUrl: process.env.FRONTEND_URL
    };
    
    try {
        const {checkoutUrl} = await payOS.createPaymentLink(body);
        await Order.updateOne({orderCode}, {checkoutUrl});
        
        res.status(200).json({
            success: true,
            checkoutUrl
        });
    } catch (err) {
        console.error('PayOS Error:', err);
        return next(new ErrorHandler('Payment link creation failed', 500));
    }
})

