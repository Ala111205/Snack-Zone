const express = require('express');
const router  = express.Router();
const { sendOTPController, register, registerShopkeeper, registerDelivery, login, adminLogin, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp',              sendOTPController);
router.post('/register',              register);
router.post('/register/shopkeeper',   registerShopkeeper);
router.post('/register/delivery',     registerDelivery);
router.post('/login',                 login);
router.post('/admin-login',           adminLogin);
router.post('/logout',                protect, logout);
router.get('/me',                     protect, getMe);

module.exports = router;
