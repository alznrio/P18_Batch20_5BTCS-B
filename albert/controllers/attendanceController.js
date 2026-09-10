const Attendance = require('../models/Attendance');
const Membership = require('../models/Membership');
const Booking = require('../models/Booking');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/attendance/checkin (Record member check-in for gym visits and booked classes)
const recordCheckIn = async (req, res, next) => {
  try {
    const actorRole = req.user.role;
    let targetMemberId = req.user._id;

    // If Trainer or Admin specifies memberId in body, they are checking in that member
    if ((actorRole === 'admin' || actorRole === 'trainer') && req.body.memberId) {
      targetMemberId = req.body.memberId;
    }

    const { type = 'gym', classId, status = 'Approved', remarks = 'Reviewed and confirmed by authorized role' } = req.body;

    // Check active membership
    const activeMembership = await Membership.findOne({
      memberId: targetMemberId,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    if (!activeMembership) {
      return sendError(
        res,
        'Cannot check in: Member does not possess an active gym membership.',
        400,
        'NO_ACTIVE_MEMBERSHIP'
      );
    }

    // If checking in for a specific class, verify they have a valid booking
    if (type === 'class' && classId) {
      const booking = await Booking.findOne({
        classId,
        memberId: targetMemberId,
        status: 'booked',
      });

      if (!booking) {
        return sendError(
          res,
          'Member does not have a confirmed booking for this class.',
          400,
          'NO_CONFIRMED_BOOKING'
        );
      }

      booking.status = 'attended';
      await booking.save();
    }

    // Record attendance
    const attendance = await Attendance.create({
      memberId: targetMemberId,
      date: new Date(),
      type,
      classId: classId || null,
      status,
      remarks,
      markedBy: req.user._id,
    });

    return sendSuccess(
      res,
      'Status updated successfully',
      {
        _id: attendance._id,
        status: attendance.status,
        date: attendance.date,
        type: attendance.type,
        remarks: attendance.remarks,
      },
      200
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/my
const getMyAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find({ memberId: req.user._id })
      .populate('classId', 'title category schedule')
      .sort({ date: -1 });

    return sendSuccess(res, 'Attendance history retrieved', records);
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance (Admin/Trainer view)
const getAllAttendance = async (req, res, next) => {
  try {
    const { memberId, classId, type, startDate, endDate } = req.query;
    const filter = {};

    if (memberId) filter.memberId = memberId;
    if (classId) filter.classId = classId;
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('memberId', 'name email phone')
      .populate('classId', 'title schedule')
      .populate('markedBy', 'name role')
      .sort({ date: -1 });

    return sendSuccess(res, 'Attendance records retrieved', records);
  } catch (err) {
    next(err);
  }
};

// PUT /api/attendance/:id/status (Review & update remarks/status by Admin/Trainer)
const updateAttendanceStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const record = await Attendance.findById(req.params.id);

    if (!record) {
      return sendError(res, 'Attendance record not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (status) record.status = status;
    if (remarks !== undefined) record.remarks = remarks;
    record.markedBy = req.user._id;

    await record.save();

    return sendSuccess(res, 'Status updated successfully', {
      _id: record._id,
      status: record.status,
      remarks: record.remarks,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordCheckIn,
  getMyAttendance,
  getAllAttendance,
  updateAttendanceStatus,
};