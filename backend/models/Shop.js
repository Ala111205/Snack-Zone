const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },
  banner:      { type: String, default: '' },

  city:    { type: String, required: true, trim: true },
  state:   { type: String, required: true, trim: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  location: { lat: Number, lng: Number },

  servicePincodes: [{ type: String, trim: true }],
  serviceCities:   [{ type: String, trim: true }],
  serviceRadius:   { type: Number, default: 15 },

  owner:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ownerName:  { type: String },
  ownerPhone: { type: String },

  // ── Payment details (stored encrypted-at-rest by MongoDB, never sent to clients) ──
  // Admin sets VITE_ADMIN_UPI in .env to receive all UPI payments centrally.
  // OR each shopkeeper can add their own UPI ID so payments go directly to them.
  paymentUpiId:    { type: String, default: '' },    // e.g. shopname@upi
  paymentBankName: { type: String, default: '' },    // e.g. SBI
  paymentAccNo:    { type: String, default: '' },    // account number (masked in API)
  paymentIFSC:     { type: String, default: '' },    // IFSC code
  paymentAccName:  { type: String, default: '' },    // account holder name

  // ── Admin notes / deactivation reason ───────────────────────────────────────────
  adminNote:       { type: String, default: '' },    // admin feedback / reason for deactivation
  deactivatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deactivatedAt:   { type: Date },

  // ── Approval workflow ────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: { type: String },
  approvedAt:      { type: Date },
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  isActive:              { type: Boolean, default: false },   // false until approved
  isVerified:            { type: Boolean, default: false },
  deliveryFee:           { type: Number, default: 40 },
  freeDeliveryAbove:     { type: Number, default: 299 },
  minOrderAmount:        { type: Number, default: 0 },
  estimatedDeliveryTime: { type: String, default: '30–45 mins' },
  openingTime:           { type: String, default: '09:00' },
  closingTime:           { type: String, default: '21:00' },

  rating:       { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalOrders:  { type: Number, default: 0 },
}, { timestamps: true });

shopSchema.index({ name: 'text', city: 'text', description: 'text' });
shopSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Shop', shopSchema);