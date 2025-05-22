const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  clerkUserId: { // Stores the ID from Clerk
    type: String,
    required: true,
    unique: true, // Each Clerk user has one profile
    index: true,
  },
  goRank: { // e.g., "10k", "3d", "Beginner"
    type: String,
    default: 'Unranked', 
  },
  goStrengthNumeric: { // A numeric representation if needed for calculations/sorting
    type: Number, // e.g., -10 for 10k, 3 for 3d. Or a Glicko/Elo rating.
    default: 0, 
  },
  // Example: Storing results of a strength test
  // strengthTestHistory: [{
  //   testDate: Date,
  //   score: Number,
  //   assignedRank: String,
  // }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

UserProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
