const express = require('express');
const router = express.Router();
const { getSnacks, getSnack, createSnack, updateSnack, deleteSnack, updateQuantity, upload } = require('../controllers/snackController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getSnacks);
router.get('/:id', getSnack);
router.post('/', protect, adminOnly, upload.single('image'), createSnack);
router.put('/:id', protect, adminOnly, upload.single('image'), updateSnack);
router.delete('/:id', protect, adminOnly, deleteSnack);
router.patch('/:id/quantity', protect, adminOnly, updateQuantity);

module.exports = router;
