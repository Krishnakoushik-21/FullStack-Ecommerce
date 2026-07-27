const Order = require('../models/orderModel');
const Product = require('../models/productModel');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
    try {
        const { orderItems, shippingAddress, paymentMethod, totalPrice } = req.body;

        if (orderItems && orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Verify stock and reduce it
        for (const item of orderItems) {
            const product = await Product.findById(item.product_id);
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({ message: `Product ${item.name || item.product_id} is out of stock` });
            }
            await Product.reduceStock(item.product_id, item.quantity);
        }

        const { fullName, address, phone } = shippingAddress;

        const orderId = await Order.create(
            req.user.id,
            fullName,
            address,
            phone,
            paymentMethod,
            totalPrice,
            orderItems
        );

        res.status(201).json({ message: 'Order created successfully', orderId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error creating order' });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.findByUserId(req.user.id);
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching orders' });
    }
};

module.exports = {
    addOrderItems,
    getMyOrders
};
