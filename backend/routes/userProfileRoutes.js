const express = require('express');
const { getMyProfile, updateMyProfile } = require('../controllers/userProfileController');
const { protect } = require('../middleware/authMiddleware'); // Clerk auth middleware

const router = express.Router();

// All routes in this file will be protected by the 'protect' middleware
router.use(protect);

router.route('/me')
  .get(getMyProfile)
  .put(updateMyProfile);

module.exports = router;
