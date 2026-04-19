const mongoose = require('mongoose');

const snackSchema = new mongoose.Schema({
  // ── Shop reference ──────────────────────────────────────
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  name:          { type: String, required: true, trim: true },
  description:   { type: String, required: true },
  price:         { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  category: {
    type: String,
    enum: ['chips','cookies','candy','nuts','beverages','healthy','chocolate','other'],
    required: true,
  },
  image:        { type: String, default: '' },
  quantity:     { type: Number, required: true, min: 0, default: 0 },
  unit:         { type: String, default: 'pcs' },
  isAvailable:  { type: Boolean, default: true },
  isFeatured:   { type: Boolean, default: false },
  tags:         [String],
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalSold:    { type: Number, default: 0 },
}, { timestamps: true });

snackSchema.virtual('inStock').get(function () { return this.quantity > 0; });
snackSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Snack', snackSchema);
