const express = require('express');
const { body } = require('express-validator');
const { getAllTrainers, getTrainerById, createTrainer, updateTrainer } = require('../controllers/trainerController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// GET /api/trainers
router.get('/', getAllTrainers);

// GET /api/trainers/:id
router.get('/:id', getTrainerById);

// POST /api/trainers (Admin only)
router.post(
  '/',
  [
    authenticate,
    authorizeRoles('admin'),
    body('name').trim().notEmpty().withMessage('Trainer name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    handleValidationErrors,
  ],
  createTrainer
);

// PUT /api/trainers/:id (Admin or Trainer self)
router.put('/:id', authenticate, authorizeRoles('admin', 'trainer'), updateTrainer);

module.exports = router;