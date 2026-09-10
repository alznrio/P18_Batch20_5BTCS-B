const express = require('express');
const { getMyNotifications, markAsRead, markAllAsRead, generateRenewalReminders } = require('../controllers/notificationController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications/my
router.get('/my', authenticate, getMyNotifications);

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, markAsRead);

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, markAllAsRead);

// POST /api/notifications/generate-renewal-reminders
router.post('/generate-renewal-reminders', authenticate, authorizeRoles('admin'), generateRenewalReminders);

module.exports = router;