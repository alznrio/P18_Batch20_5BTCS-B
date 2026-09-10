const express = require('express');
const authRoutes = require('./authRoutes');
const planRoutes = require('./planRoutes');
const membershipRoutes = require('./membershipRoutes');
const trainerRoutes = require('./trainerRoutes');
const classRoutes = require('./classRoutes');
const bookingRoutes = require('./bookingRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const waitlistRoutes = require('./waitlistRoutes');
const workoutDietRoutes = require('./workoutDietRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const reportRoutes = require('./reportRoutes');

const { bookClass } = require('../controllers/bookingController');
const { joinWaitlist } = require('../controllers/waitlistController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Mount resources
router.use('/auth', authRoutes);
router.use('/plans', planRoutes);
router.use('/memberships', membershipRoutes);
router.use('/trainers', trainerRoutes);

// Direct prompt match: POST /api/classes/:id/book and POST /api/classes/:id/waitlist
classRoutes.post('/:id/book', authenticate, authorizeRoles('member'), bookClass);
classRoutes.post('/:id/waitlist', authenticate, authorizeRoles('member'), joinWaitlist);

router.use('/classes', classRoutes);
router.use('/bookings', bookingRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/workout-diet', workoutDietRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin/reports', reportRoutes);

// System health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'P18 Gym & Fitness API is online and healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;