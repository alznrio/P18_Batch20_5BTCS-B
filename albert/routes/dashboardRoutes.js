const express = require('express');
const { getMemberDashboard, getTrainerDashboard, getAdminDashboard } = require('../controllers/dashboardController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/member
router.get('/member', authenticate, authorizeRoles('member'), getMemberDashboard);

// GET /api/dashboard/trainer
router.get('/trainer', authenticate, authorizeRoles('trainer'), getTrainerDashboard);

// GET /api/dashboard/admin
router.get('/admin', authenticate, authorizeRoles('admin'), getAdminDashboard);

module.exports = router;