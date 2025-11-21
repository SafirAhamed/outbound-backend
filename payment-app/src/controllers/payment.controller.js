const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');
const config = require('../config/config');
const { paymentService, orderService } = require('../services');

let razorpay;
try {
  razorpay = paymentService.createRazorpayInstance(config.razorpayKeyId, config.razorpayKeySecret);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('Could not initialize Razorpay in controller:', e && e.message ? e.message : e);
}

async function createOrder(req, res, next) {
  console.log('createOrder called with body:', req.body);
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body || {};
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(numericAmount * 100), // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    };

    if (!razorpay) return res.status(500).json({ message: 'Payment gateway not initialized' });

    const order = await paymentService.createOrder(razorpay, options);

    try {
      await orderService.saveOrderFromRazorpay(order);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Could not persist order to MongoDB:', e && e.message ? e.message : e);
    }

    return res.json(order);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('createOrder controller error', err && err.message ? err.message : err);
    return next(err);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const secret = config.razorpayKeySecret;
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValidSignature = validateWebhookSignature(payload, razorpay_signature, secret);
    if (!isValidSignature) return res.status(400).json({ message: 'Invalid signature' });

    try {
      await orderService.markOrderPaid(razorpay_order_id, razorpay_payment_id);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to update order in DB:', e && e.message ? e.message : e);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('verifyPayment controller error', err && err.message ? err.message : err);
    return next(err);
  }
}

module.exports = {
  createOrder,
  verifyPayment,
};
