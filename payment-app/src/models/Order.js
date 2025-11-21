const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  order_id: { type: String, required: true, unique: true },
  amount: Number,
  currency: String,
  receipt: String,
  status: { type: String, default: 'created' },
  payment_id: String,
}, {
  timestamps: true,
});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
