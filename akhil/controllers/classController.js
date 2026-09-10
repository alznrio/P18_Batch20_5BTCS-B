const Class = require('../models/Class');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/classes
const getAllClasses = async (req, res, next) => {
  try {
    const { trainerId, category, status } = req.query;
    const filter = {};
    if (trainerId) filter.trainerId = trainerId;
    if (category) filter.category = category;
    if (status) filter.status = status;

    const classes = await Class.find(filter)
      .populate('trainerId', 'name email specialization phone')
      .sort({ schedule: 1 });

    return sendSuccess(res, 'Classes retrieved successfully', classes);
  } catch (err) {
    next(err);
  }
};

// GET /api/classes/:id
const getClassById = async (req, res, next) => {
  try {
    const gymClass = await Class.findById(req.params.id).populate('trainerId', 'name email specialization bio');
    if (!gymClass) {
      return sendError(res, 'Class not found', 404, 'RESOURCE_NOT_FOUND');
    }

    const bookings = await Booking.find({ classId: gymClass._id, status: 'booked' })
      .populate('memberId', 'name email phone');

    return sendSuccess(res, 'Class details retrieved', {
      class: gymClass,
      availableSlots: Math.max(0, gymClass.capacity - gymClass.bookedCount),
      roster: bookings,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/classes (Trainer or Admin creates a class)
const createClass = async (req, res, next) => {
  try {
    let { trainerId, title, description, category, schedule, durationMinutes, capacity, room } = req.body;

    // If a trainer is creating, auto-assign their own ID unless admin
    if (req.user.role === 'trainer') {
      trainerId = req.user._id;
    } else if (!trainerId) {
      return sendError(res, 'Trainer ID is required when creating a class.', 400, 'VALIDATION_ERROR');
    }

    // Verify trainer exists
    const trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
    if (!trainer) {
      return sendError(res, 'Assigned user is not a valid registered trainer.', 400, 'INVALID_TRAINER');
    }

    const parsedSchedule = new Date(schedule);
    if (isNaN(parsedSchedule.getTime())) {
      return sendError(res, 'Invalid schedule date/time format.', 400, 'VALIDATION_ERROR');
    }

    const newClass = await Class.create({
      trainerId,
      title,
      description: description || '',
      category: category || 'General',
      schedule: parsedSchedule,
      durationMinutes: durationMinutes || 60,
      capacity: parseInt(capacity, 10) || 20,
      room: room || 'Main Studio',
      status: 'scheduled',
    });

    const populated = await Class.findById(newClass._id).populate('trainerId', 'name email specialization');

    return sendSuccess(res, 'Class scheduled successfully', populated, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/classes/:id (Trainer or Admin)
const updateClass = async (req, res, next) => {
  try {
    const gymClass = await Class.findById(req.params.id);
    if (!gymClass) {
      return sendError(res, 'Class not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check ownership
    if (req.user.role === 'trainer' && gymClass.trainerId.toString() !== req.user._id.toString()) {
      return sendError(res, 'You can only update classes assigned to you.', 403, 'FORBIDDEN');
    }

    const { title, description, category, schedule, durationMinutes, capacity, room, status } = req.body;

    if (title) gymClass.title = title;
    if (description !== undefined) gymClass.description = description;
    if (category) gymClass.category = category;
    if (schedule) gymClass.schedule = new Date(schedule);
    if (durationMinutes !== undefined) gymClass.durationMinutes = durationMinutes;
    if (capacity !== undefined) gymClass.capacity = capacity;
    if (room !== undefined) gymClass.room = room;
    if (status) gymClass.status = status;

    await gymClass.save();

    return sendSuccess(res, 'Class updated successfully', gymClass);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/classes/:id (Trainer or Admin cancels class)
const deleteClass = async (req, res, next) => {
  try {
    const gymClass = await Class.findById(req.params.id);
    if (!gymClass) {
      return sendError(res, 'Class not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (req.user.role === 'trainer' && gymClass.trainerId.toString() !== req.user._id.toString()) {
      return sendError(res, 'You can only cancel classes assigned to you.', 403, 'FORBIDDEN');
    }

    gymClass.status = 'cancelled';
    await gymClass.save();

    // Notify booked members
    const bookings = await Booking.find({ classId: gymClass._id, status: 'booked' });
    for (const b of bookings) {
      b.status = 'cancelled';
      await b.save();

      await Notification.create({
        memberId: b.memberId,
        title: 'Class Cancelled',
        message: `Your class '${gymClass.title}' scheduled for ${gymClass.schedule.toLocaleString()} has been cancelled.`,
        type: 'booking',
      });
    }

    return sendSuccess(res, 'Class cancelled successfully', gymClass);
  } catch (err) {
    next(err);
  }
};

// GET /api/classes/trainer/my-schedule
const getMyTrainerSchedule = async (req, res, next) => {
  try {
    const classes = await Class.find({ trainerId: req.user._id })
      .sort({ schedule: 1 });
    return sendSuccess(res, 'Trainer class schedule retrieved', classes);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getMyTrainerSchedule,
};