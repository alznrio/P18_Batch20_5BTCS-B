const express = require('express');
const { getAttendanceReport, getPlanPopularityReport, getRenewalRateReport, getAdminOverviewReport } = require('../controllers/reportController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// All reporting endpoints are Branch Admin restricted
router.use(authenticate, authorizeRoles('admin'));

// GET /api/admin/reports/attendance
router.get('/attendance', getAttendanceReport);

// GET /api/admin/reports/plans
router.get('/plans', getPlanPopularityReport);

// GET /api/admin/reports/renewals
router.get('/renewals', getRenewalRateReport);

// GET /api/admin/reports/overview
router.get('/overview', getAdminOverviewReport);

module.exports = router;