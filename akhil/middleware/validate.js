const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return sendError(
      res,
      firstError.msg || 'Requested action violates a business rule or failed validation',
      400,
      'VALIDATION_ERROR',
      errors.array()
    );
  }
  next();
};

module.exports = {
  handleValidationErrors,
};