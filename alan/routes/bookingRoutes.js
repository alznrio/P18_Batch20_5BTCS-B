const express = require('express');
const { bookClass, getMyBookings, cancelBooking } = require('../controllers/bookingController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// POST /api/classes/:id/book (Member books a class)
// Also accessible directly via /api/bookings/:id/book or mounted in class routes
router.post('/:id/book', authenticate, authorizeRoles('member'), bookClass);

// GET /api/bookings/my
router.get('/my', authenticate, authorizeRoles('member'), getMyBookings);

// DELETE /api/bookings/:id/cancel
router.delete('/:id/cancel', authenticate, cancelBooking);

module.exports = router;