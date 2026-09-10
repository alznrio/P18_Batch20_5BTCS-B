const WorkoutDietNote = require('../models/WorkoutDietNote');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/workout-diet (Trainer logs workout & diet plan notes)
const createWorkoutDietNote = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const { memberId, title, targetGoals, workoutNotes, dietNotes } = req.body;

    const member = await User.findOne({ _id: memberId, role: 'member' });
    if (!member) {
      return sendError(res, 'Invalid gym member ID specified.', 400, 'INVALID_MEMBER');
    }

    const note = await WorkoutDietNote.create({
      memberId,
      trainerId,
      title,
      targetGoals: targetGoals || 'General fitness & strength',
      workoutNotes,
      dietNotes,
    });

    // Notify member
    await Notification.create({
      memberId,
      title: 'New Workout & Nutrition Plan Added!',
      message: `Your trainer ${req.user.name} has added a new workout & diet plan: "${title}".`,
      type: 'general',
    });

    const populated = await WorkoutDietNote.findById(note._id)
      .populate('trainerId', 'name email specialization')
      .populate('memberId', 'name email');

    return sendSuccess(res, 'Workout and diet plan notes logged successfully', populated, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/workout-diet/my (Member reads their own notes)
const getMyWorkoutDietNotes = async (req, res, next) => {
  try {
    const notes = await WorkoutDietNote.find({ memberId: req.user._id })
      .populate('trainerId', 'name email specialization')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Workout and diet notes retrieved', notes);
  } catch (err) {
    next(err);
  }
};

// GET /api/workout-diet/member/:memberId (Trainer / Admin)
const getNotesByMemberId = async (req, res, next) => {
  try {
    const notes = await WorkoutDietNote.find({ memberId: req.params.memberId })
      .populate('trainerId', 'name email specialization')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'Member workout and diet notes retrieved', notes);
  } catch (err) {
    next(err);
  }
};

// PUT /api/workout-diet/:id (Trainer updates notes)
const updateWorkoutDietNote = async (req, res, next) => {
  try {
    const note = await WorkoutDietNote.findById(req.params.id);
    if (!note) {
      return sendError(res, 'Workout/diet note not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (req.user.role !== 'admin' && note.trainerId.toString() !== req.user._id.toString()) {
      return sendError(res, 'You can only modify workout plans created by you.', 403, 'FORBIDDEN');
    }

    const { title, targetGoals, workoutNotes, dietNotes } = req.body;
    if (title) note.title = title;
    if (targetGoals !== undefined) note.targetGoals = targetGoals;
    if (workoutNotes) note.workoutNotes = workoutNotes;
    if (dietNotes) note.dietNotes = dietNotes;

    await note.save();

    return sendSuccess(res, 'Workout/diet note updated successfully', note);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createWorkoutDietNote,
  getMyWorkoutDietNotes,
  getNotesByMemberId,
  updateWorkoutDietNote,
};