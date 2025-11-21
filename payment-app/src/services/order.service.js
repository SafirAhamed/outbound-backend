const Order = require('../models/Order');

async function saveOrderFromRazorpay(razorpayOrder) {
  if (!razorpayOrder || !razorpayOrder.id) {
    throw new Error('Invalid razorpay order');
  }

  return Order.create({
    order_id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    receipt: razorpayOrder.receipt,
    status: 'created',
  });
}

async function markOrderPaid(orderId, paymentId) {
  if (!orderId || !paymentId) {
    throw new Error('orderId and paymentId are required');
  }

  return Order.findOneAndUpdate(
    { order_id: orderId },
    { $set: { status: 'paid', payment_id: paymentId } },
    { new: true }
  ).exec();
}

async function findByOrderId(orderId) {
  if (!orderId) return null;
  return Order.findOne({ order_id: orderId }).exec();
}

module.exports = {
  saveOrderFromRazorpay,
  markOrderPaid,
  findByOrderId,
};
