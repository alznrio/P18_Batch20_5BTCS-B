const User = require('../models/User');
const { generateToken } = require('../utils/token');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, specialization, bio, experienceYears, emergencyContact } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'An account with this email address already exists.', 409, 'DUPLICATE_RESOURCE');
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // If role requested is admin, ensure only existing admin can grant, or allow if no users exist
    let assignedRole = role || 'member';
    if (assignedRole === 'admin') {
      const userCount = await User.countDocuments();
      if (userCount > 0 && (!req.user || req.user.role !== 'admin')) {
        return sendError(res, 'Only an authorized Branch Admin can create an admin account.', 403, 'FORBIDDEN');
      }
    }

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: assignedRole,
      phone: phone || '',
      specialization: specialization || [],
      bio: bio || '',
      experienceYears: experienceYears || 0,
      emergencyContact: emergencyContact || '',
    });

    const token = generateToken(user);
    const userJson = user.toObject();
    delete userJson.passwordHash;

    return sendSuccess(res, 'User registered successfully', { user: userJson, token }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken(user);
    const userJson = user.toObject();
    delete userJson.passwordHash;

    return sendSuccess(res, 'Login successful', { user: userJson, token });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 'User profile retrieved', req.user);
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, emergencyContact, specialization, bio, experienceYears } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 'User not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (emergencyContact !== undefined) user.emergencyContact = emergencyContact;

    if (user.role === 'trainer' || user.role === 'admin') {
      if (specialization !== undefined) user.specialization = specialization;
      if (bio !== undefined) user.bio = bio;
      if (experienceYears !== undefined) user.experienceYears = experienceYears;
    }

    await user.save();
    const userJson = user.toObject();
    delete userJson.passwordHash;

    return sendSuccess(res, 'Profile updated successfully', userJson);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/users (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    return sendSuccess(res, 'Users retrieved successfully', users);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  getAllUsers,
};