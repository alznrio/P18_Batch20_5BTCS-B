const express = require('express');
const { joinWaitlist, getClassWaitlist, getMyWaitlists, leaveWaitlist } = require('../controllers/waitlistController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// POST /api/classes/:id/waitlist (Join waitlist)
router.post('/class/:id', authenticate, authorizeRoles('member'), joinWaitlist);

// GET /api/waitlist/class/:id (View waitlist for a class)
router.get('/class/:id', authenticate, authorizeRoles('trainer', 'admin'), getClassWaitlist);

// GET /api/waitlist/my (Member's active waitlists)
router.get('/my', authenticate, authorizeRoles('member'), getMyWaitlists);

// DELETE /api/waitlist/:id
router.delete('/:id', authenticate, leaveWaitlist);

module.exports = router;