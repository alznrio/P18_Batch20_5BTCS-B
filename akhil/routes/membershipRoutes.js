const express = require('express');
const { purchaseMembership, getMyMembership, getAllMemberships, cancelMembership, checkExpiries } = require('../controllers/membershipController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// POST /api/memberships (Purchase membership plan)
router.post('/', authenticate, authorizeRoles('member', 'admin'), purchaseMembership);

// GET /api/memberships/my
router.get('/my', authenticate, authorizeRoles('member'), getMyMembership);

// GET /api/memberships (Admin only)
router.get('/', authenticate, authorizeRoles('admin'), getAllMemberships);

// PUT /api/memberships/:id/cancel
router.put('/:id/cancel', authenticate, cancelMembership);

// POST /api/memberships/check-expiries
router.post('/check-expiries', authenticate, authorizeRoles('admin'), checkExpiries);

module.exports = router;