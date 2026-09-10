const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendError(res, messages.join(', '), 400, 'VALIDATION_ERROR');
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return sendError(res, `A record with this ${field} already exists.`, 409, 'DUPLICATE_RESOURCE');
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return sendError(res, `Resource with id '${err.value}' not found or invalid format.`, 404, 'RESOURCE_NOT_FOUND');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token provided.', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired.', 401, 'TOKEN_EXPIRED');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  return sendError(res, message, statusCode, errorCode);
};

module.exports = errorHandler;