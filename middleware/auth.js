const ApiError = require('../utils/ApiError');

/**
 * Gate for every write route. Reads the Passport session that
 * `passport.session()` already resolved, so a request either arrives with a
 * real user attached or is rejected before it can touch the database.
 */
const requireAuth = (req, res, next) => {
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    return next();
  }

  return next(
    ApiError.unauthorized('Authentication required. Sign in at /auth/github before writing data.')
  );
};

module.exports = { requireAuth };
