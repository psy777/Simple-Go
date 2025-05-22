const UserProfile = require('../models/UserProfile');

// @desc    Get current user's Wrengo profile (or create if none)
// @route   GET /api/userprofile/me
// @access  Private
exports.getMyProfile = async (req, res, next) => {
  try {
    let userProfile = await UserProfile.findOne({ clerkUserId: req.auth.userId });

    if (!userProfile) {
      // If no profile exists, create one for the new user
      userProfile = await UserProfile.create({
        clerkUserId: req.auth.userId,
        // goRank and goStrengthNumeric will use schema defaults
      });
    }

    res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Error getting/creating user profile:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update current user's Wrengo profile
// @route   PUT /api/userprofile/me
// @access  Private
exports.updateMyProfile = async (req, res, next) => {
  try {
    const { goRank, goStrengthNumeric } = req.body;

    // Find the profile (it should exist if getMyProfile was called upon login/app load)
    let userProfile = await UserProfile.findOne({ clerkUserId: req.auth.userId });

    if (!userProfile) {
      // This case should ideally be rare if frontend calls getMyProfile first
      // Or, we can opt to create it here too if preferred.
      // For now, let's assume it should exist for an update.
      // Alternatively, use findOneAndUpdate with upsert:true if creation on update is desired.
       userProfile = await UserProfile.create({
        clerkUserId: req.auth.userId,
        goRank: goRank || 'Unranked',
        goStrengthNumeric: goStrengthNumeric || 0,
      });
    } else {
        // Update fields if provided
        if (goRank !== undefined) userProfile.goRank = goRank;
        if (goStrengthNumeric !== undefined) userProfile.goStrengthNumeric = goStrengthNumeric;
        // Add other updatable fields here
        await userProfile.save();
    }
    
    res.status(200).json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
