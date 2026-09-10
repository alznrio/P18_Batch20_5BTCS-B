const { verifyToken } = require('../utils/token');
const { sendError } = require('../utils/response');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing or invalid', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return sendError(res, 'Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return sendError(res, 'User associated with this token no longer exists', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Role '${req.user ? req.user.role : 'anonymous'}' is not authorized to perform this action.`,
        403,
        'FORBIDDEN'
      );
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles,
};