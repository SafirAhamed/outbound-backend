const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');

/* eslint-disable camelcase */

const app = express();

dotenv.config();

const port = process.env.PAYMENT_APP_PORT || 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from payment-app directory
app.use('/rzp', express.static(path.join(__dirname)));

// Razorpay credentials — prefer environment variables in production
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_RhgWyIytKKhX4f';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'NDGRWyroLb2J5goY5ogxVJ9w';
const { paymentService, orderService } = require('./services');
let razorpay;
try {
  razorpay = paymentService.createRazorpayInstance(razorpayKeyId, razorpayKeySecret);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('Could not initialize Razorpay instance:', e && e.message ? e.message : e);
}

// MongoDB connection
const mongoUri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/payment-app';

mongoose.set('strictQuery', false);
// Load Order model from models folder
const { Order } = require('./models');

// Connect to MongoDB before handling requests
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB at', mongoUri);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err && err.message ? err.message : err);
  });

// Route to handle order creation
app.post('/create-order', async (req, res, next) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body || {};
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(numericAmount * 100), // Convert amount to paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    };

    if (!razorpay) {
      return res.status(500).json({ message: 'Payment gateway not initialized' });
    }

    const order = await paymentService.createOrder(razorpay, options);

    // Persist to MongoDB for lightweight tracking
    try {
      await orderService.saveOrderFromRazorpay(order);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Could not persist order to MongoDB:', e && e.message ? e.message : e);
    }

    return res.json(order);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('create-order error', error && error.message ? error.message : error);
    return next(error);
  }
});

// Route to serve the success page
app.get('/payment-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'success.html'));
});

// Route to handle payment verification
app.post('/verify-payment', async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const secret = razorpayKeySecret;
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValidSignature = validateWebhookSignature(payload, razorpay_signature, secret);
    if (!isValidSignature) return res.status(400).json({ message: 'Invalid signature' });

    // Update the order with payment details in MongoDB
    try {
      await Order.findOneAndUpdate(
        { order_id: razorpay_order_id },
        { $set: { status: 'paid', payment_id: razorpay_payment_id } },
        { new: true }
      ).exec();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to update order in DB:', e && e.message ? e.message : e);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('verify-payment error', error && error.message ? error.message : error);
    return next(error);
  }
});

// Centralized error handler
/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err && err.message ? err.message : 'Internal Server Error' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Payment app listening on port ${port}`);
});

module.exports = app;
