const express = require('express')
const router = express.Router();

const {
   receiveHookPayment,createPaymentLink
} = require('../controllers/paymentController')

const { isAuthenticatedUser } = require('../middlewares/auth')

// router.route('/payment/process').post(isAuthenticatedUser, processPayment);
// router.route('/stripeapi').get(isAuthenticatedUser, sendStripApi);
router.route("/create-payment-link").post(createPaymentLink)
router.route("/receive-hook").post(receiveHookPayment)

module.exports = router;