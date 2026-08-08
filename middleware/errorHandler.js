const ApiError = require('../utils/ApiError');

/**
 * Catches any request that matched no route and converts it into a 404 that
 * flows through the same error shape as everything else.
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
};

/**
 * Single place where every error becomes an HTTP response. Keeping this last in
 * the middleware chain guarantees a consistent JSON body for all failures.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Body-parser throws this when the client sends malformed JSON.
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body is not valid JSON';
  }

  // Duplicate key from a unique index, e.g. two ingredients with the same name.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `An entry with that ${field} already exists`;
  }

  // Never leak internals on an unexpected failure, but do log it server-side.
  if (statusCode >= 500) {
    console.error('Unhandled error:', err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
      details = undefined;
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      status: statusCode,
      message,
      ...(details ? { details } : {})
    }
  });
};

module.exports = { notFoundHandler, errorHandler };
