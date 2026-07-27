const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

router.get('/', auth, cartController.getCart);
router.post('/add', auth, cartController.addToCart);
router.post('/update', auth, cartController.updateCart);
router.post('/remove', auth, cartController.removeFromCart);
router.post('/clear', auth, cartController.clearCart);
router.post('/coupon', auth, cartController.validateCoupon);

module.exports = router;
