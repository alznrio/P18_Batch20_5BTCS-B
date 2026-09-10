const Notification = require('../models/Notification');
const Membership = require('../models/Membership');
const { sendSuccess, sendError } = require('../utils/response');
const { daysRemaining } = require('../utils/dateHelpers');

// GET /api/notifications/my
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ memberId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ memberId: req.user._id, isRead: false });

    return sendSuccess(res, 'Notifications retrieved', {
      unreadCount,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      memberId: req.user._id,
    });

    if (!notification) {
      return sendError(res, 'Notification not found', 404, 'RESOURCE_NOT_FOUND');
    }

    notification.isRead = true;
    await notification.save();

    return sendSuccess(res, 'Notification marked as read', notification);
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ memberId: req.user._id, isRead: false }, { isRead: true });
    return sendSuccess(res, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

// POST /api/notifications/generate-renewal-reminders (Admin or automated cron)
const generateRenewalReminders = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Active memberships expiring within 7 days
    const expiringSoon = await Membership.find({
      status: 'active',
      endDate: { $gt: now, $lte: sevenDaysFromNow },
    }).populate('memberId', 'name email').populate('planId', 'name');

    let remindersCreated = 0;

    for (const item of expiringSoon) {
      const days = daysRemaining(item.endDate);
      const title = `Membership Expiry Notice (${days} day${days === 1 ? '' : 's'} remaining)`;
      const message = `Hello ${item.memberId.name}, your ${item.planId.name} gym membership is expiring in ${days} day(s) on ${new Date(item.endDate).toLocaleDateString()}. Please renew soon to prevent interruption in class bookings and gym access.`;

      // Prevent duplicate notification today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const existingNotif = await Notification.findOne({
        memberId: item.memberId._id,
        type: 'renewal',
        createdAt: { $gte: startOfDay },
      });

      if (!existingNotif) {
        await Notification.create({
          memberId: item.memberId._id,
          title,
          message,
          type: 'renewal',
        });
        remindersCreated++;
      }
    }

    return sendSuccess(res, `Renewal reminder scan complete. ${remindersCreated} new notifications sent.`, {
      remindersCreated,
      totalExpiringSoon: expiringSoon.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  generateRenewalReminders,
};