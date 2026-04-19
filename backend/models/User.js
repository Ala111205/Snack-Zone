const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label:     { type: String, default: 'Home' },
  street:    { type: String, required: true },
  city:      { type: String, required: true },
  state:     { type: String, required: true },
  pincode:   { type: String, required: true },
  landmark:  { type: String },
  lat:       { type: Number },
  lng:       { type: Number },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  phone:      { type: String, required: true, unique: true, trim: true },
  password:   { type: String, required: true },
  addresses:  [addressSchema],
  role: {
    type: String,
    enum: ['user', 'admin', 'delivery', 'shopowner'],
    default: 'user',
  },
  isVerified:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  avatar:      { type: String, default: '' },
  currentCity:    { type: String, default: '' },
  currentPincode: { type: String, default: '' },

  // Shopkeeper fields
  shopId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  shopApprovalStatus:  { type: String, enum: ['none','pending','approved','rejected'], default: 'none' },
  shopRejectionReason: { type: String },

  // Delivery boy online status
  isOnline:  { type: Boolean, default: false },
  lastSeen:  { type: Date },

  cart: [{
    snack:    { type: mongoose.Schema.Types.ObjectId, ref: 'Snack' },
    quantity: { type: Number, default: 1 },
    shop:     { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchPassword = async function (p) {
  return bcrypt.compare(p, this.password);
};

module.exports = mongoose.model('User', userSchema);
