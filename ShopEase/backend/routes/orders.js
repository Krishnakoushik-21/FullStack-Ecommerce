'use strict';

const express         = require('express');
const router          = express.Router();
const orderController = require('../controllers/orderController');
const auth            = require('../middleware/auth');

// ─── Order endpoints ──────────────────────────────────────────────────────────
router.get ('/',                  auth, orderController.getOrders);
router.get ('/:id',               auth, orderController.getOrderDetails);
router.post('/create',            auth, orderController.createOrder);

// Order status update (admin or internal use – still requires valid JWT)
router.patch('/status/:id',       auth, orderController.updateOrderStatus);

// ─── Address endpoints ────────────────────────────────────────────────────────
router.get ('/addresses/all',     auth, orderController.getAddresses);
router.post('/addresses/add',     auth, orderController.addAddress);
router.delete('/addresses/:id',   auth, orderController.deleteAddress);

module.exports = router;
