/**
 * Standardized API Response Helper
 * Conforms to project specification:
 * SUCCESS: { success: true, message: "...", data: { ... } }
 * ERROR:   { success: false, message: "...", errorCode: "..." }
 */

const sendSuccess = (res, message = 'Success', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message = 'An error occurred', statusCode = 400, errorCode = 'BAD_REQUEST', errors = null) => {
  const payload = {
    success: false,
    message,
    errorCode,
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError,
};