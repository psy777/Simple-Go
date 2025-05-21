const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
require('dotenv').config({ path: '../.env' }); // Ensure .env is loaded

// This is Clerk's recommended middleware for protecting routes.
// It will automatically verify the session token from the Authorization header.
// If valid, it populates req.auth with session claims (including userId, sessionId, etc.).
// If invalid or missing, it returns a 401 or 403 error.

// Note: ClerkExpressRequireAuth() returns an array of middleware functions.
// The options object can be used to customize behavior, e.g., error handling.
// For basic protection, we can use it directly.

const protect = ClerkExpressRequireAuth({
  // You can add options here if needed, for example:
  // onError: (err) => (req, res, next) => {
  //   console.error('Clerk auth error:', err);
  //   res.status(401).json({ success: false, message: 'Not authorized' });
  // }
});


// We also need to adjust how controllers access the user ID.
// Clerk's req.auth object contains the userId.
// We can add a small middleware to extract this and place it on req.user.id
// for compatibility with how the SGF controller expects it, or update the controller.
// For now, let's assume controllers will be updated to use req.auth.userId.

module.exports = { protect };
