const Membership = require('../models/Membership');
const Booking = require('../models/Booking');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Waitlist = require('../models/Waitlist');
const WorkoutDietNote = require('../models/WorkoutDietNote');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSuccess } = require('../utils/response');
const { daysRemaining } = require('../utils/dateHelpers');

// GET /api/dashboard/member (Module 11: Member Self-Service Dashboard)
const getMemberDashboard = async (req, res, next) => {
  try {
    const memberId = req.user._id;

    // 1. Membership info
    const activeMembership = await Membership.findOne({
      memberId,
      status: 'active',
      endDate: { $gt: new Date() },
    }).populate('planId');

    let membershipDetails = null;
    if (activeMembership) {
      membershipDetails = {
        _id: activeMembership._id,
        planName: activeMembership.planId ? activeMembership.planId.name : 'Custom Plan',
        startDate: activeMembership.startDate,
        endDate: activeMembership.endDate,
        daysRemaining: daysRemaining(activeMembership.endDate),
        status: activeMembership.status,
      };
    }

    // 2. Upcoming booked classes
    const upcomingBookings = await Booking.find({
      memberId,
      status: 'booked',
    })
      .populate({
        path: 'classId',
        match: { schedule: { $gte: new Date() } },
        populate: { path: 'trainerId', select: 'name specialization' },
      })
      .sort({ createdAt: -1 });

    const filteredBookings = upcomingBookings.filter((b) => b.classId !== null);

    // 3. Waitlist entries
    const waitlists = await Waitlist.find({
      memberId,
      status: 'waiting',
    }).populate('classId', 'title schedule');

    // 4. Attendance history & metrics
    const attendanceRecords = await Attendance.find({ memberId })
      .populate('classId', 'title')
      .sort({ date: -1 })
      .limit(10);

    const totalVisits = await Attendance.countDocuments({ memberId });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const visitsThisMonth = await Attendance.countDocuments({
      memberId,
      date: { $gte: startOfMonth },
    });

    // 5. Recent workout & diet notes
    const recentNotes = await WorkoutDietNote.find({ memberId })
      .populate('trainerId', 'name specialization')
      .sort({ createdAt: -1 })
      .limit(3);

    // 6. Unread notification count
    const unreadNotifications = await Notification.countDocuments({ memberId, isRead: false });

    return sendSuccess(res, 'Member dashboard retrieved', {
      member: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
      },
      membership: membershipDetails,
      upcomingBookings: filteredBookings,
      waitlists,
      attendance: {
        totalVisits,
        visitsThisMonth,
        recent: attendanceRecords,
      },
      recentNotes,
      unreadNotifications,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/trainer
const getTrainerDashboard = async (req, res, next) => {
  try {
    const trainerId = req.user._id;

    const upcomingClasses = await Class.find({
      trainerId,
      status: 'scheduled',
      schedule: { $gte: new Date() },
    }).sort({ schedule: 1 });

    const totalClassesTaught = await Class.countDocuments({ trainerId });

    return sendSuccess(res, 'Trainer dashboard retrieved', {
      trainer: req.user,
      upcomingClasses,
      totalClassesTaught,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/admin
const getAdminDashboard = async (req, res, next) => {
  try {
    const totalMembers = await User.countDocuments({ role: 'member' });
    const totalTrainers = await User.countDocuments({ role: 'trainer' });
    const activeMemberships = await Membership.countDocuments({
      status: 'active',
      endDate: { $gt: new Date() },
    });

    const activeClasses = await Class.countDocuments({ status: 'scheduled' });
    const totalAttendanceToday = await Attendance.countDocuments({
      date: { $gte: new Date().setHours(0, 0, 0, 0) },
    });

    const revenueResult = await Membership.aggregate([
      { $match: { status: { $in: ['active', 'expired'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    return sendSuccess(res, 'Branch Admin dashboard retrieved', {
      totalMembers,
      totalTrainers,
      activeMemberships,
      activeClasses,
      totalAttendanceToday,
      totalRevenue,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMemberDashboard,
  getTrainerDashboard,
  getAdminDashboard,
};