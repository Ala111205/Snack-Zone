const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  purpose: { type: String, enum: ['register', 'login', 'reset'], default: 'register' },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 10 * 60 * 1000) },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
