const crypto = require('crypto');
const config = require('../config/config');
const { Payment, Booking } = require('../models');

// Razorpay webhook handler — expects raw body (app.js should mount this route with express.raw)
exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = config.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // raw Buffer because we mounted express.raw for this route

    const generated = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (generated !== signature) {
      return res.status(400).send('invalid signature');
    }

    const event = JSON.parse(body.toString());

    // handle payment captured event
    if (event.event === 'payment.captured' && event.payload && event.payload.payment && event.payload.payment.entity) {
      const pay = event.payload.payment.entity;
      const orderId = pay.order_id;

      // mark payment as paid
      const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { razorpayPaymentId: pay.id, razorpaySignature: signature, status: 'paid' },
        { new: true }
      );

      if (payment) {
        // create booking if not exists
        let booking = await Booking.findOne({ payment: payment._id });
        if (!booking) {
          booking = await Booking.create({
            user: payment.user,
            tour: payment.tour,
            price: payment.amount,
            paid: true,
            payment: payment._id,
          });
        }
      }
    }

    // always return 200 to acknowledge receipt
    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook processing error', err.message);
    res.status(500).send('error');
  }
};
