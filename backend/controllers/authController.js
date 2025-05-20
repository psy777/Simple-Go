const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' }); // Ensure .env is loaded relative to backend directory

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with that email' });
    }
    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with that username' });
    }

    // Create user
    user = await User.create({
      username,
      email,
      password,
    });

    // Create token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: { // Optionally return some user info
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide an email and password' });
  }

  try {
    // Check for user
    const user = await User.findOne({ email }).select('+password'); // Explicitly select password

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials (user not found)' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials (password incorrect)' });
    }

    // Create token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: { // Optionally return some user info
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private (requires auth middleware later)
exports.getMe = async (req, res, next) => {
  // This route will be protected. For now, let's assume req.user is populated by auth middleware
  // We will add the auth middleware in a later step.
  // const user = await User.findById(req.user.id); // Example if req.user.id is set by middleware
  // res.status(200).json({ success: true, data: user });
  res.status(200).json({ success: true, message: "getMe route - to be protected" });
};
