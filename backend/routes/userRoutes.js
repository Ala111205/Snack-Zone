const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, addAddress, updateAddress, deleteAddress, updateCart, getCart } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:addressId', protect, updateAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);
router.get('/cart', protect, getCart);
router.post('/cart', protect, updateCart);

module.exports = router;
