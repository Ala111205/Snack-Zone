const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  snack:    { type: mongoose.Schema.Types.ObjectId, ref: 'Snack', required: true },
  name:     String,
  image:    String,
  price:    Number,
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Shop reference ──────────────────────────────────────
  shop:     { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  shopName: { type: String }, // snapshot

  items: [orderItemSchema],

  deliveryAddress: {
    name: String, phone: String,
    street: String, city: String, state: String, pincode: String,
    landmark: String, lat: Number, lng: Number,
  },
  paymentMethod: {
    type: String,
    enum: ['cod','card','phonepay','gpay','paytm'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending','paid','failed','refunded'],
    default: 'pending',
  },
  paymentDetails: { transactionId: String, paidAt: Date, method: String },

  orderStatus: {
    type: String,
    enum: ['placed','confirmed','preparing','out_for_delivery','delivered','cancelled'],
    default: 'placed',
  },
  statusHistory: [{ status: String, timestamp: { type: Date, default: Date.now }, note: String }],

  subtotal:    Number,
  deliveryFee: { type: Number, default: 40 },
  discount:    { type: Number, default: 0 },
  total:       Number,

  deliveryBoy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveryLocation: { lat: Number, lng: Number, updatedAt: Date },

  estimatedDelivery: Date,
  deliveredAt:       Date,
  cancelledAt:       Date,
  cancelReason:      String,
  notes:             String,
  requiresDeliveryOTP: { type: Boolean, default: false }, // true for online-paid orders
  codCollected:       { type: Boolean, default: false }, // delivery boy confirmed cash collected
  codCollectedAt:     { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
