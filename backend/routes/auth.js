const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/refresh', authController.refresh);

// Protected routes
router.get('/profile', authenticateToken, (req, res) => {
  res.json({ 
    success: true,
    user: req.user 
  });
});

router.patch('/profile', authenticateToken, (req, res) => {
  res.json({ 
    success: true,
    message: 'Profile updated successfully' 
  });
});

// Admin only
router.get('/admin/users', authenticateToken, requireAdmin, (req, res) => {
  res.json({ 
    success: true,
    message: 'Admin users list',
    data: []
  });
});

module.exports = router;

