const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
} = require('../controllers/authController');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerUser);

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginUser);

// @desc    Get logged in user
// @route   GET /api/auth/me
// @access  Private (to be implemented with middleware)
router.get('/me', getMe); // We'll add middleware later to protect this

module.exports = router;
