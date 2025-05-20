const Sgf = require('../models/Sgf');
const User = require('../models/User'); // May not be strictly needed here if all user checks are via req.user

// @desc    Get all SGFs for the logged-in user
// @route   GET /api/sgfs
// @access  Private
exports.getSgfs = async (req, res, next) => {
  try {
    const sgfs = await Sgf.find({ user: req.user.id }).sort({ lastModifiedAt: -1 }); // Sort by most recently modified
    res.status(200).json({
      success: true,
      count: sgfs.length,
      data: sgfs,
    });
  } catch (error) {
    console.error('Error getting SGFs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get a single SGF by ID for the logged-in user
// @route   GET /api/sgfs/:id
// @access  Private
exports.getSgfById = async (req, res, next) => {
  try {
    const sgf = await Sgf.findById(req.params.id);

    if (!sgf) {
      return res.status(404).json({ success: false, message: 'SGF not found' });
    }

    // Ensure user owns the SGF
    if (sgf.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this SGF' });
    }

    res.status(200).json({
      success: true,
      data: sgf,
    });
  } catch (error) {
    console.error('Error getting SGF by ID:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ success: false, message: 'SGF not found (invalid ID format)' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a new SGF for the logged-in user
// @route   POST /api/sgfs
// @access  Private
exports.createSgf = async (req, res, next) => {
  const { title, sgfContent, description } = req.body;

  if (!title || !sgfContent) {
    return res.status(400).json({ success: false, message: 'Please provide a title and SGF content' });
  }

  try {
    const newSgf = await Sgf.create({
      user: req.user.id,
      title,
      sgfContent,
      description, // Optional
    });

    res.status(201).json({
      success: true,
      data: newSgf,
    });
  } catch (error) {
    console.error('Error creating SGF:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update an SGF by ID for the logged-in user
// @route   PUT /api/sgfs/:id
// @access  Private
exports.updateSgf = async (req, res, next) => {
  const { title, sgfContent, description } = req.body;

  try {
    let sgf = await Sgf.findById(req.params.id);

    if (!sgf) {
      return res.status(404).json({ success: false, message: 'SGF not found' });
    }

    // Ensure user owns the SGF
    if (sgf.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this SGF' });
    }

    // Update fields if they are provided
    if (title) sgf.title = title;
    if (sgfContent) sgf.sgfContent = sgfContent;
    if (description !== undefined) sgf.description = description; // Allow clearing description

    sgf.lastModifiedAt = Date.now(); // Explicitly set here, though pre-save hook also does it
    
    const updatedSgf = await sgf.save();

    res.status(200).json({
      success: true,
      data: updatedSgf,
    });
  } catch (error) {
    console.error('Error updating SGF:', error);
     if (error.kind === 'ObjectId') {
        return res.status(404).json({ success: false, message: 'SGF not found (invalid ID format)' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete an SGF by ID for the logged-in user
// @route   DELETE /api/sgfs/:id
// @access  Private
exports.deleteSgf = async (req, res, next) => {
  try {
    const sgf = await Sgf.findById(req.params.id);

    if (!sgf) {
      return res.status(404).json({ success: false, message: 'SGF not found' });
    }

    // Ensure user owns the SGF
    if (sgf.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this SGF' });
    }

    await sgf.deleteOne(); // Mongoose v6+ uses deleteOne() on the document

    res.status(200).json({
      success: true,
      data: {}, // Or a message like { message: 'SGF removed' }
    });
  } catch (error) {
    console.error('Error deleting SGF:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ success: false, message: 'SGF not found (invalid ID format)' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
