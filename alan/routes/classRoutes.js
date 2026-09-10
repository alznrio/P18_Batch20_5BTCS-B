const express = require('express');
const { body } = require('express-validator');
const { getAllClasses, getClassById, createClass, updateClass, deleteClass, getMyTrainerSchedule } = require('../controllers/classController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// GET /api/classes
router.get('/', getAllClasses);

// GET /api/classes/trainer/my-schedule
router.get('/trainer/my-schedule', authenticate, authorizeRoles('trainer'), getMyTrainerSchedule);

// GET /api/classes/:id
router.get('/:id', getClassById);

// POST /api/classes (Trainer or Admin)
router.post(
  '/',
  [
    authenticate,
    authorizeRoles('trainer', 'admin'),
    body('title').trim().notEmpty().withMessage('Class title is required'),
    body('schedule').notEmpty().withMessage('Valid schedule date/time is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    handleValidationErrors,
  ],
  createClass
);

// PUT /api/classes/:id (Trainer or Admin)
router.put('/:id', authenticate, authorizeRoles('trainer', 'admin'), updateClass);

// DELETE /api/classes/:id (Trainer or Admin)
router.delete('/:id', authenticate, authorizeRoles('trainer', 'admin'), deleteClass);

module.exports = router;