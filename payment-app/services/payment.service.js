const Razorpay = require('razorpay');

function createRazorpayInstance(keyId, keySecret) {
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keyId and keySecret are required');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function createOrder(razorpayInstance, options) {
  if (!razorpayInstance || !razorpayInstance.orders) {
    throw new Error('Invalid razorpay instance');
  }
  return razorpayInstance.orders.create(options);
}

module.exports = {
  createRazorpayInstance,
  createOrder,
};
