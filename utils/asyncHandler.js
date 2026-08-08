/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * middleware. Without this, an await that throws becomes an unhandled rejection
 * and the request hangs instead of returning 500.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
