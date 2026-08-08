/**
 * Error type carrying an HTTP status code, so controllers can signal an exact
 * response ("404 recipe not found") and the central error handler can trust it.
 * Anything thrown that is NOT an ApiError is treated as an unexpected 500.
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
    if (details) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, details);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Unprocessable entity', details) {
    return new ApiError(422, message, details);
  }
}

module.exports = ApiError;
