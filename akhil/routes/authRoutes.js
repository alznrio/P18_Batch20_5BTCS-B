const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, updateProfile, getAllUsers } = require('../controllers/authController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').optional().isIn(['member', 'trainer', 'admin']).withMessage('Role must be member, trainer, or admin'),
    handleValidationErrors,
  ],
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
  login
);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

// PUT /api/auth/profile
router.put('/profile', authenticate, updateProfile);

// GET /api/auth/users (Admin only)
router.get('/users', authenticate, authorizeRoles('admin'), getAllUsers);

module.exports = router;