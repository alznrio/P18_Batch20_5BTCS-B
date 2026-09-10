const User = require('../models/User');
const Class = require('../models/Class');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/trainers
const getAllTrainers = async (req, res, next) => {
  try {
    const trainers = await User.find({ role: 'trainer' })
      .select('-passwordHash')
      .sort({ name: 1 });
    return sendSuccess(res, 'Trainers retrieved successfully', trainers);
  } catch (err) {
    next(err);
  }
};

// GET /api/trainers/:id
const getTrainerById = async (req, res, next) => {
  try {
    const trainer = await User.findOne({ _id: req.params.id, role: 'trainer' }).select('-passwordHash');
    if (!trainer) {
      return sendError(res, 'Trainer not found', 404, 'RESOURCE_NOT_FOUND');
    }

    const upcomingClasses = await Class.find({
      trainerId: trainer._id,
      schedule: { $gte: new Date() },
      status: 'scheduled',
    }).sort({ schedule: 1 });

    return sendSuccess(res, 'Trainer details retrieved', {
      trainer,
      upcomingClasses,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/trainers (Admin only)
const createTrainer = async (req, res, next) => {
  try {
    const { name, email, password, phone, specialization, bio, experienceYears } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return sendError(res, 'An account with this email already exists.', 409, 'DUPLICATE_RESOURCE');
    }

    const passwordHash = await User.hashPassword(password || 'Trainer@123');

    const trainer = await User.create({
      name,
      email,
      passwordHash,
      role: 'trainer',
      phone: phone || '',
      specialization: specialization || [],
      bio: bio || '',
      experienceYears: experienceYears || 0,
    });

    const trainerJson = trainer.toObject();
    delete trainerJson.passwordHash;

    return sendSuccess(res, 'Trainer profile created successfully', trainerJson, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/trainers/:id (Admin or Trainer self)
const updateTrainer = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return sendError(res, 'Not authorized to update this trainer profile', 403, 'FORBIDDEN');
    }

    const trainer = await User.findOne({ _id: id, role: 'trainer' });
    if (!trainer) {
      return sendError(res, 'Trainer not found', 404, 'RESOURCE_NOT_FOUND');
    }

    const { name, phone, specialization, bio, experienceYears } = req.body;
    if (name) trainer.name = name;
    if (phone !== undefined) trainer.phone = phone;
    if (specialization !== undefined) trainer.specialization = specialization;
    if (bio !== undefined) trainer.bio = bio;
    if (experienceYears !== undefined) trainer.experienceYears = experienceYears;

    await trainer.save();

    const trainerJson = trainer.toObject();
    delete trainerJson.passwordHash;

    return sendSuccess(res, 'Trainer profile updated successfully', trainerJson);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
};