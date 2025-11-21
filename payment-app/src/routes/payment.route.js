const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { createOrderRules, verifyPaymentRules, validate } = require('../validators/order.validation');

router.post('/payments/create-order', createOrderRules, validate, paymentController.createOrder);
router.post('/payments/verify-payment', verifyPaymentRules, validate, paymentController.verifyPayment);

module.exports = router;
