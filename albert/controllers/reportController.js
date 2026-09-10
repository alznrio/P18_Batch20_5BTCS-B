const Attendance = require('../models/Attendance');
const Membership = require('../models/Membership');
const MembershipPlan = require('../models/MembershipPlan');
const Class = require('../models/Class');
const User = require('../models/User');
const { sendSuccess } = require('../utils/response');

// GET /api/admin/reports/attendance (Attendance trends & peak breakdown)
const getAttendanceReport = async (req, res, next) => {
  try {
    // 1. Overall stats
    const totalCheckIns = await Attendance.countDocuments();
    const gymVisits = await Attendance.countDocuments({ type: 'gym' });
    const classVisits = await Attendance.countDocuments({ type: 'class' });

    // 2. Trend by past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyTrends = await Attendance.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          count: { $sum: 1 },
          gymCount: {
            $sum: { $cond: [{ $eq: ['$type', 'gym'] }, 1, 0] },
          },
          classCount: {
            $sum: { $cond: [{ $eq: ['$type', 'class'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. Status breakdown
    const statusBreakdown = await Attendance.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return sendSuccess(res, 'Attendance report generated', {
      totalCheckIns,
      gymVisits,
      classVisits,
      dailyTrends,
      statusBreakdown,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/reports/plans (Membership plan popularity & revenue)
const getPlanPopularityReport = async (req, res, next) => {
  try {
    const planStats = await Membership.aggregate([
      {
        $group: {
          _id: '$planId',
          subscriptionCount: { $sum: 1 },
          totalRevenue: { $sum: '$amountPaid' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'membershipplans',
          localField: '_id',
          foreignField: '_id',
          as: 'planDetails',
        },
      },
      { $unwind: '$planDetails' },
      {
        $project: {
          planId: '$_id',
          planName: '$planDetails.name',
          durationMonths: '$planDetails.durationMonths',
          price: '$planDetails.price',
          subscriptionCount: 1,
          totalRevenue: 1,
          activeCount: 1,
        },
      },
      { $sort: { subscriptionCount: -1 } },
    ]);

    return sendSuccess(res, 'Plan popularity report generated', planStats);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/reports/renewals (Renewal rate & retention metrics)
const getRenewalRateReport = async (req, res, next) => {
  try {
    const totalMemberships = await Membership.countDocuments();
    const activeCount = await Membership.countDocuments({ status: 'active' });
    const expiredCount = await Membership.countDocuments({ status: 'expired' });
    const cancelledCount = await Membership.countDocuments({ status: 'cancelled' });

    // Members with more than 1 membership (renewed members)
    const renewedMembersResult = await Membership.aggregate([
      {
        $group: {
          _id: '$memberId',
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    const totalUniqueMembers = (await Membership.distinct('memberId')).length;
    const renewedMembersCount = renewedMembersResult.length;
    const renewalRate = totalUniqueMembers > 0
      ? ((renewedMembersCount / totalUniqueMembers) * 100).toFixed(1)
      : 0;

    return sendSuccess(res, 'Renewal and retention report generated', {
      totalMemberships,
      activeCount,
      expiredCount,
      cancelledCount,
      totalUniqueMembers,
      renewedMembersCount,
      renewalRatePercent: parseFloat(renewalRate),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/reports/overview (Full BI overview for charts)
const getAdminOverviewReport = async (req, res, next) => {
  try {
    const [attendance, plans, renewals] = await Promise.all([
      getAttendanceReportData(),
      getPlanStatsData(),
      getRenewalStatsData(),
    ]);

    return sendSuccess(res, 'Branch Admin full business intelligence report', {
      attendance,
      plans,
      renewals,
    });
  } catch (err) {
    next(err);
  }
};

// Internal helpers for overview
const getAttendanceReportData = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  return Attendance.aggregate([
    { $match: { date: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const getPlanStatsData = async () => {
  return Membership.aggregate([
    {
      $group: {
        _id: '$planId',
        count: { $sum: 1 },
        revenue: { $sum: '$amountPaid' },
      },
    },
    {
      $lookup: {
        from: 'membershipplans',
        localField: '_id',
        foreignField: '_id',
        as: 'plan',
      },
    },
    { $unwind: '$plan' },
    {
      $project: {
        name: '$plan.name',
        count: 1,
        revenue: 1,
      },
    },
  ]);
};

const getRenewalStatsData = async () => {
  const total = await Membership.countDocuments();
  const active = await Membership.countDocuments({ status: 'active' });
  const expired = await Membership.countDocuments({ status: 'expired' });
  return { total, active, expired };
};

module.exports = {
  getAttendanceReport,
  getPlanPopularityReport,
  getRenewalRateReport,
  getAdminOverviewReport,
};