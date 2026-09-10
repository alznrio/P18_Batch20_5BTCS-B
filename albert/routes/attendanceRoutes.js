const express = require('express');
const { recordCheckIn, getMyAttendance, getAllAttendance, updateAttendanceStatus } = require('../controllers/attendanceController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// POST /api/attendance/checkin (Check-in for gym or class)
router.post('/checkin', authenticate, recordCheckIn);

// GET /api/attendance/my (Member's check-in history)
router.get('/my', authenticate, authorizeRoles('member'), getMyAttendance);

// GET /api/attendance (Admin and Trainer view)
router.get('/', authenticate, authorizeRoles('admin', 'trainer'), getAllAttendance);

// PUT /api/attendance/:id/status (Review & update status)
router.put('/:id/status', authenticate, authorizeRoles('admin', 'trainer'), updateAttendanceStatus);

module.exports = router;