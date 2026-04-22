const mongoose = require('mongoose');

/* ── CodNotification ────────────────────────────────────
   Created whenever a delivery partner clicks "Cash Collected".
   Admin reads these from GET /api/admin/cod-notifications.
   ─────────────────────────────────────────────────────── */
const codNotificationSchema = new mongoose.Schema({
  order:         { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  deliveryBoy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  deliveryBoyName:  String,
  deliveryBoyPhone: String,
  shop:          { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  shopName:      String,
  amount:        Number,          // cash amount collected
  collectedAt:   { type: Date, default: Date.now },
  isRead:        { type: Boolean, default: false },  // admin marks read
}, { timestamps: true });

module.exports = mongoose.model('CodNotification', codNotificationSchema);
