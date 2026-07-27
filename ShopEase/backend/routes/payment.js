'use strict';

/**
 * routes/payment.js
 *
 * Razorpay payment routes, all protected by JWT auth middleware.
 *
 *  GET  /api/payment/key            → Return public Razorpay key_id (no secret)
 *  POST /api/payment/create-order   → Create Razorpay order + store pending checkout data
 *  POST /api/payment/verify         → Verify HMAC signature → create DB order on success
 *  POST /api/payment/failure        → Log payment failure / cancellation (no order created)
 */

const express           = require('express');
const router            = express.Router();
const paymentController = require('../controllers/paymentController');
const auth              = require('../middleware/auth');

router.get ('/key',          auth, paymentController.getKeyId);
router.post('/create-order', auth, paymentController.createRazorpayOrder);
router.post('/verify',       auth, paymentController.verifyPayment);
router.post('/failure',      auth, paymentController.handleFailure);

module.exports = router;
