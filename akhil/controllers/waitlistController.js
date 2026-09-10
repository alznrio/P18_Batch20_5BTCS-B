const Waitlist = require('../models/Waitlist');
const Class = require('../models/Class');
const Booking = require('../models/Booking');
const Membership = require('../models/Membership');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/classes/:id/waitlist (Waitlist members when class is full)
const joinWaitlist = async (req, res, next) => {
  try {
    const classId = req.params.id;
    const memberId = req.user._id;

    // Check active membership
    const activeMembership = await Membership.findOne({
      memberId,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    if (!activeMembership) {
      return sendError(
        res,
        'Active gym membership required to join a class waitlist.',
        400,
        'NO_ACTIVE_MEMBERSHIP'
      );
    }

    const gymClass = await Class.findById(classId);
    if (!gymClass) {
      return sendError(res, 'Class session not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check if class is full
    if (gymClass.bookedCount < gymClass.capacity) {
      return sendError(
        res,
        'Class still has open slots. You can book directly without waitlisting.',
        400,
        'CLASS_NOT_FULL'
      );
    }

    // Check if already booked
    const existingBooking = await Booking.findOne({ classId, memberId, status: 'booked' });
    if (existingBooking) {
      return sendError(res, 'You already hold a confirmed booking for this class.', 409, 'ALREADY_BOOKED');
    }

    // Check if already on waitlist
    const existingWaitlist = await Waitlist.findOne({ classId, memberId, status: 'waiting' });
    if (existingWaitlist) {
      return sendError(res, `You are already on the waitlist at position #${existingWaitlist.position}.`, 409, 'ALREADY_WAITLISTED');
    }

    const position = gymClass.waitlistCount + 1;

    const waitlistEntry = await Waitlist.create({
      classId,
      memberId,
      position,
      status: 'waiting',
    });

    gymClass.waitlistCount += 1;
    await gymClass.save();

    return sendSuccess(res, `Joined waitlist successfully at position #${position}`, waitlistEntry, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/classes/:id/waitlist
const getClassWaitlist = async (req, res, next) => {
  try {
    const list = await Waitlist.find({ classId: req.params.id, status: 'waiting' })
      .populate('memberId', 'name email phone')
      .sort({ position: 1 });

    return sendSuccess(res, 'Class waitlist retrieved', list);
  } catch (err) {
    next(err);
  }
};

// GET /api/waitlist/my
const getMyWaitlists = async (req, res, next) => {
  try {
    const list = await Waitlist.find({ memberId: req.user._id })
      .populate('classId', 'title category schedule capacity bookedCount')
      .sort({ addedAt: -1 });

    return sendSuccess(res, 'Member waitlist entries retrieved', list);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/waitlist/:id
const leaveWaitlist = async (req, res, next) => {
  try {
    const entry = await Waitlist.findById(req.params.id);
    if (!entry) {
      return sendError(res, 'Waitlist entry not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (entry.memberId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'Not authorized to modify this waitlist entry', 403, 'FORBIDDEN');
    }

    entry.status = 'cancelled';
    await entry.save();

    const gymClass = await Class.findById(entry.classId);
    if (gymClass) {
      gymClass.waitlistCount = Math.max(0, gymClass.waitlistCount - 1);
      await gymClass.save();
    }

    return sendSuccess(res, 'Removed from waitlist successfully', entry);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  joinWaitlist,
  getClassWaitlist,
  getMyWaitlists,
  leaveWaitlist,
};