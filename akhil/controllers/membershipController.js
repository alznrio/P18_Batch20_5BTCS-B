const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');
const { addMonths } = require('../utils/dateHelpers');

// POST /api/memberships (Purchase a membership plan)
const purchaseMembership = async (req, res, next) => {
  try {
    const memberId = req.user._id;
    const { planId, name, durationMonths, price, autoRenewal } = req.body;

    let targetPlan = null;

    if (planId) {
      targetPlan = await MembershipPlan.findById(planId);
      if (!targetPlan || !targetPlan.isActive) {
        return sendError(res, 'Selected membership plan is inactive or not found.', 400, 'INVALID_PLAN');
      }
    } else if (name) {
      targetPlan = await MembershipPlan.findOne({ name });
      if (!targetPlan) {
        // Create plan if it doesn't exist (flexible for sample request testing)
        targetPlan = await MembershipPlan.create({
          name,
          durationMonths: parseInt(durationMonths, 10) || 1,
          price: parseFloat(price) || 999,
          isActive: true,
        });
      }
    } else {
      return sendError(res, 'Please provide either a valid planId or plan name.', 400, 'VALIDATION_ERROR');
    }

    // Check for existing active membership
    const activeMembership = await Membership.findOne({
      memberId,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    let startDate = new Date();
    // If user already has an active membership, extend from current endDate (renewal behavior)
    if (activeMembership) {
      startDate = new Date(activeMembership.endDate);
      // Mark prior as superseded or let it complete
    }

    const duration = parseInt(targetPlan.durationMonths, 10);
    const endDate = addMonths(startDate, duration);
    const amountPaid = targetPlan.price;

    const membership = await Membership.create({
      memberId,
      planId: targetPlan._id,
      startDate,
      endDate,
      status: 'active',
      amountPaid,
      autoRenewal: !!autoRenewal,
    });

    // Create confirmation notification
    await Notification.create({
      memberId,
      title: 'Membership Activated!',
      message: `Your '${targetPlan.name}' membership has been activated successfully until ${endDate.toDateString()}.`,
      type: 'general',
    });

    return sendSuccess(
      res,
      'Record created successfully',
      {
        _id: membership._id,
        plan: targetPlan.name,
        startDate: membership.startDate,
        endDate: membership.endDate,
        amountPaid: membership.amountPaid,
        status: membership.status,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/memberships/my
const getMyMembership = async (req, res, next) => {
  try {
    const memberships = await Membership.find({ memberId: req.user._id })
      .populate('planId')
      .sort({ createdAt: -1 });

    const active = memberships.find((m) => m.status === 'active' && new Date(m.endDate) > new Date());

    return sendSuccess(res, 'Member memberships retrieved', {
      activeMembership: active || null,
      history: memberships,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/memberships (Admin only)
const getAllMemberships = async (req, res, next) => {
  try {
    const { status, memberId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (memberId) filter.memberId = memberId;

    const list = await Membership.find(filter)
      .populate('memberId', 'name email phone')
      .populate('planId', 'name durationMonths price')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 'All memberships retrieved', list);
  } catch (err) {
    next(err);
  }
};

// PUT /api/memberships/:id/cancel
const cancelMembership = async (req, res, next) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      return sendError(res, 'Membership not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check ownership or admin
    if (req.user.role !== 'admin' && membership.memberId.toString() !== req.user._id.toString()) {
      return sendError(res, 'You are not authorized to cancel this membership.', 403, 'FORBIDDEN');
    }

    membership.status = 'cancelled';
    await membership.save();

    return sendSuccess(res, 'Membership cancelled successfully', membership);
  } catch (err) {
    next(err);
  }
};

// POST /api/memberships/check-expiries (Admin / Cron trigger)
const checkExpiries = async (req, res, next) => {
  try {
    const now = new Date();
    const expiredMemberships = await Membership.find({
      status: 'active',
      endDate: { $lte: now },
    });

    for (const m of expiredMemberships) {
      m.status = 'expired';
      await m.save();

      await Notification.create({
        memberId: m.memberId,
        title: 'Membership Expired',
        message: 'Your gym membership has expired. Please renew to continue booking classes and accessing the gym.',
        type: 'expiry',
      });
    }

    return sendSuccess(res, `Processed expiry scan. ${expiredMemberships.length} memberships marked as expired.`, {
      updatedCount: expiredMemberships.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  purchaseMembership,
  getMyMembership,
  getAllMemberships,
  cancelMembership,
  checkExpiries,
};