const Snack  = require('../models/Snack');
const Shop   = require('../models/Shop');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/snacks');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `snack_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/snacks  — filter by shop, category, city
const getSnacks = async (req, res) => {
  try {
    const { category, search, featured, shop, city } = req.query;
    const filter = { isAvailable: true };
    if (category && category !== 'all') filter.category = category;
    if (search)         filter.name      = { $regex: search, $options: 'i' };
    if (featured === 'true') filter.isFeatured = true;
    if (shop)           filter.shop      = shop;

    // If city is provided, find all approved shops in that city first, then filter snacks
    if (city) {
      const shops = await Shop.find({
        status: 'approved', isActive: true,
        $or: [
          { city:          { $regex: city, $options: 'i' } },
          { serviceCities: { $regex: city, $options: 'i' } },
        ],
      }).select('_id');
      const shopIds = shops.map(s => s._id);
      filter.shop = { $in: shopIds };
    }

    const snacks = await Snack.find(filter)
      .populate('shop', 'name city isActive status deliveryFee freeDeliveryAbove estimatedDeliveryTime')
      .sort({ isFeatured: -1, createdAt: -1 });

    // Only return snacks from shops that are approved and active
    const activeSnacks = snacks.filter(s =>
      s.shop &&
      s.shop.isActive === true &&
      s.shop.status === 'approved'
    );
    res.json(activeSnacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/snacks/:id
const getSnack = async (req, res) => {
  try {
    const snack = await Snack.findById(req.params.id).populate('shop', 'name city address deliveryFee freeDeliveryAbove estimatedDeliveryTime');
    if (!snack) return res.status(404).json({ message: 'Snack not found' });
    res.json(snack);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/snacks (admin) — requires shop in body
const createSnack = async (req, res) => {
  try {
    if (!req.body.shop) return res.status(400).json({ message: 'Shop ID is required' });
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/snacks/${req.file.filename}`;
    const snack = await Snack.create(data);
    res.status(201).json(await snack.populate('shop', 'name city'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/snacks/:id (admin)
const updateSnack = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/snacks/${req.file.filename}`;
    const snack = await Snack.findByIdAndUpdate(req.params.id, data, { new: true })
      .populate('shop', 'name city');
    if (!snack) return res.status(404).json({ message: 'Snack not found' });
    res.json(snack);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/snacks/:id (admin)
const deleteSnack = async (req, res) => {
  try {
    const snack = await Snack.findByIdAndDelete(req.params.id);
    if (!snack) return res.status(404).json({ message: 'Snack not found' });
    res.json({ message: 'Snack deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/snacks/:id/quantity (admin)
const updateQuantity = async (req, res) => {
  try {
    const snack = await Snack.findByIdAndUpdate(
      req.params.id,
      { quantity: req.body.quantity },
      { new: true }
    );
    res.json(snack);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSnacks, getSnack, createSnack, updateSnack, deleteSnack, updateQuantity, upload };
