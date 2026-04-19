const User = require('../models/User');

// GET /api/user/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('cart.snack');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/user/profile
const updateProfile = async (req, res) => {
  try {
    const { name, avatar, currentCity, currentPincode } = req.body;
    const updates = {};
    if (name)         updates.name         = name;
    if (avatar)       updates.avatar       = avatar;
    if (currentCity !== undefined)   updates.currentCity   = currentCity;
    if (currentPincode !== undefined) updates.currentPincode = currentPincode;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/user/addresses
const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.body.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }
    user.addresses.push(req.body);
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/user/addresses/:addressId
const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ message: 'Address not found' });
    if (req.body.isDefault) {
      user.addresses.forEach(a => a.isDefault = false);
    }
    Object.assign(addr, req.body);
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/user/addresses/:addressId
const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addressId);
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/user/cart
const updateCart = async (req, res) => {
  try {
    const { cart } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { cart }, { new: true }).populate('cart.snack');
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/user/cart
const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.snack');
    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getProfile, updateProfile, addAddress, updateAddress, deleteAddress, updateCart, getCart };
