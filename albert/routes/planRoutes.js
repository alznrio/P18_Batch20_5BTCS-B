const express = require('express');
const { body } = require('express-validator');
const { getAllPlans, getPlanById, createPlan, updatePlan, deletePlan } = require('../controllers/planController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// GET /api/plans
router.get('/', getAllPlans);

// GET /api/plans/:id
router.get('/:id', getPlanById);

// POST /api/plans (Admin only)
router.post(
  '/',
  [
    authenticate,
    authorizeRoles('admin'),
    body('name').trim().notEmpty().withMessage('Plan name is required'),
    body('durationMonths').isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    handleValidationErrors,
  ],
  createPlan
);

// PUT /api/plans/:id (Admin only)
router.put('/:id', authenticate, authorizeRoles('admin'), updatePlan);

// DELETE /api/plans/:id (Admin only)
router.delete('/:id', authenticate, authorizeRoles('admin'), deletePlan);

module.exports = router;