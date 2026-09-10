const express = require('express');
const { body } = require('express-validator');
const { createWorkoutDietNote, getMyWorkoutDietNotes, getNotesByMemberId, updateWorkoutDietNote } = require('../controllers/workoutDietController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// POST /api/workout-diet (Trainer logs notes)
router.post(
  '/',
  [
    authenticate,
    authorizeRoles('trainer', 'admin'),
    body('memberId').notEmpty().withMessage('Member ID is required'),
    body('title').trim().notEmpty().withMessage('Note title is required'),
    body('workoutNotes').trim().notEmpty().withMessage('Workout notes are required'),
    body('dietNotes').trim().notEmpty().withMessage('Diet notes are required'),
    handleValidationErrors,
  ],
  createWorkoutDietNote
);

// GET /api/workout-diet/my (Member gets their notes)
router.get('/my', authenticate, authorizeRoles('member'), getMyWorkoutDietNotes);

// GET /api/workout-diet/member/:memberId (Trainer/Admin gets notes for a member)
router.get('/member/:memberId', authenticate, authorizeRoles('trainer', 'admin'), getNotesByMemberId);

// PUT /api/workout-diet/:id (Update notes)
router.put('/:id', authenticate, authorizeRoles('trainer', 'admin'), updateWorkoutDietNote);

module.exports = router;