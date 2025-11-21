const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');

const app = express();

const port = process.env.PAYMENT_APP_PORT || 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from payment-app directory
app.use(express.static(path.join(__dirname)));

// Razorpay credentials — prefer environment variables in production
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_RhgWyIytKKhX4f';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'NDGRWyroLb2J5goY5ogxVJ9w';
const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

// Function to read data from JSON file
const ORDERS_FILE = path.join(__dirname, 'orders.json');

const readData = () => {
  if (fs.existsSync(ORDERS_FILE)) {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  }
  return [];
};

// Function to write data to JSON file
const writeData = (data) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2));
};

// Initialize orders.json if it doesn't exist
if (!fs.existsSync(ORDERS_FILE)) {
  writeData([]);
}

// Route to handle order creation
app.post('/create-order', async (req, res) => {
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

    const order = await razorpay.orders.create(options);

    // Persist to local orders.json for lightweight tracking (optional)
    const orders = readData();
    orders.push({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: 'created',
    });
    writeData(orders);

    return res.json(order); // Send order details to frontend, including order ID
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('create-order error', error && error.message ? error.message : error);
    return res.status(500).json({ message: 'Error creating order' });
  }
});

// Route to serve the success page
app.get('/payment-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'success.html'));
});

// Route to handle payment verification
app.post('/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const secret = razorpayKeySecret;
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValidSignature = validateWebhookSignature(payload, razorpay_signature, secret);
    if (!isValidSignature) return res.status(400).json({ message: 'Invalid signature' });

    // Update the order with payment details (local store)
    const orders = readData();
    const order = orders.find((o) => o.order_id === razorpay_order_id);
    if (order) {
      order.status = 'paid';
      order.payment_id = razorpay_payment_id;
      writeData(orders);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('verify-payment error', error && error.message ? error.message : error);
    return res.status(500).json({ status: 'error', message: 'Error verifying payment' });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Payment app listening on port ${port}`);
});

module.exports = app;
