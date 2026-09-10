const Booking = require('../models/Booking');
const Class = require('../models/Class');
const Membership = require('../models/Membership');
const Waitlist = require('../models/Waitlist');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/classes/:id/book (Member books a class)
const bookClass = async (req, res, next) => {
  try {
    const memberId = req.user._id;
    const classId = req.params.id;

    // 1. Verify Member has an active membership
    const activeMembership = await Membership.findOne({
      memberId,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    if (!activeMembership) {
      return sendError(
        res,
        'An active gym membership is required to book fitness classes. Please purchase a plan first.',
        400,
        'NO_ACTIVE_MEMBERSHIP'
      );
    }

    // 2. Verify class exists and is scheduled
    const gymClass = await Class.findById(classId);
    if (!gymClass) {
      return sendError(res, 'Class session not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    if (gymClass.status !== 'scheduled') {
      return sendError(res, `Cannot book class. Current status is '${gymClass.status}'.`, 400, 'CLASS_UNAVAILABLE');
    }

    // 3. Prevent duplicate bookings
    const existingBooking = await Booking.findOne({
      classId,
      memberId,
      status: 'booked',
    });
    if (existingBooking) {
      return sendError(res, 'You have already booked a slot in this class.', 409, 'ALREADY_BOOKED');
    }

    // 4. Validate capacity
    if (gymClass.bookedCount >= gymClass.capacity) {
      return sendError(
        res,
        'Class is at maximum capacity. You can join the waitlist instead.',
        409,
        'CLASS_FULL'
      );
    }

    // 5. Create booking & increment count
    const booking = await Booking.create({
      classId,
      memberId,
      status: 'booked',
    });

    gymClass.bookedCount += 1;
    await gymClass.save();

    // Send confirmation notification
    await Notification.create({
      memberId,
      title: 'Class Booking Confirmed!',
      message: `You are confirmed for '${gymClass.title}' on ${gymClass.schedule.toLocaleString()}.`,
      type: 'booking',
    });

    return sendSuccess(res, 'Class booked successfully', booking, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/my
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ memberId: req.user._id })
      .populate({
        path: 'classId',
        populate: { path: 'trainerId', select: 'name email phone specialization' },
      })
      .sort({ bookedAt: -1 });

    return sendSuccess(res, 'Bookings retrieved successfully', bookings);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (booking.memberId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'You are not authorized to cancel this booking.', 403, 'FORBIDDEN');
    }

    if (booking.status === 'cancelled') {
      return sendError(res, 'Booking is already cancelled.', 400, 'ALREADY_CANCELLED');
    }

    booking.status = 'cancelled';
    await booking.save();

    const gymClass = await Class.findById(booking.classId);
    if (gymClass) {
      gymClass.bookedCount = Math.max(0, gymClass.bookedCount - 1);

      // Auto promote next person from Waitlist if anyone is waiting
      const nextInWaitlist = await Waitlist.findOne({
        classId: gymClass._id,
        status: 'waiting',
      }).sort({ position: 1 });

      if (nextInWaitlist) {
        nextInWaitlist.status = 'promoted';
        await nextInWaitlist.save();

        // Create booking for promoted member
        await Booking.create({
          classId: gymClass._id,
          memberId: nextInWaitlist.memberId,
          status: 'booked',
        });

        gymClass.bookedCount += 1;
        gymClass.waitlistCount = Math.max(0, gymClass.waitlistCount - 1);

        await Notification.create({
          memberId: nextInWaitlist.memberId,
          title: 'Waitlist Promotion: Slot Confirmed!',
          message: `A slot opened up! You have been automatically booked into '${gymClass.title}' on ${gymClass.schedule.toLocaleString()}.`,
          type: 'waitlist',
        });
      }

      await gymClass.save();
    }

    return sendSuccess(res, 'Booking cancelled successfully', booking);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  bookClass,
  getMyBookings,
  cancelBooking,
};