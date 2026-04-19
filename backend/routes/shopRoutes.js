const express = require('express');
const router  = express.Router();
const {
  getShops, getCities, getShop, getShopSnacks,
  createShop, updateShop, deleteShop, getAllShopsAdmin, upload,
} = require('../controllers/shopController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public
router.get('/',              getShops);
router.get('/cities',        getCities);
router.get('/admin/all',     protect, adminOnly, getAllShopsAdmin);
router.get('/:id',           getShop);
router.get('/:id/snacks',    getShopSnacks);

// Admin CRUD
router.post('/',             protect, adminOnly, upload.single('image'), createShop);
router.put('/:id',           protect, adminOnly, upload.single('image'), updateShop);
router.delete('/:id',        protect, adminOnly, deleteShop);

module.exports = router;
