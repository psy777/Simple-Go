const mongoose = require('mongoose');

const SgfSchema = new mongoose.Schema({
  user: { // This will store Clerk's userId
    type: String,
    required: true,
    index: true, // Good to index if you query SGFs by user
  },
  title: {
    type: String,
    required: [true, 'Please add a title for your SGF'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  sgfContent: {
    type: String,
    required: [true, 'SGF content is required'],
  },
  description: { // Optional field for user notes about the SGF
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now,
  },
  // You could add other fields like:
  // tags: [String],
  // isPublic: { type: Boolean, default: false },
  // difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'pro'] } 
});

// Middleware to update lastModifiedAt on save
SgfSchema.pre('save', function (next) {
  if (this.isModified()) { // only update if actually modified to prevent unnecessary updates
    this.lastModifiedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Sgf', SgfSchema);
