const express = require('express');
const router = express.Router();
const {
  getSgfs,
  getSgfById,
  createSgf,
  updateSgf,
  deleteSgf,
} = require('../controllers/sgfController');
const { protect } = require('../middleware/authMiddleware'); // Middleware to protect routes

// All routes in this file will be protected and prefixed with /api/sgfs (defined in server.js)

// Route to get all SGFs for the logged-in user and create a new SGF
router.route('/')
  .get(protect, getSgfs)
  .post(protect, createSgf);

// Route to get, update, or delete a specific SGF by its ID
router.route('/:id')
  .get(protect, getSgfById)
  .put(protect, updateSgf)
  .delete(protect, deleteSgf);

module.exports = router;
