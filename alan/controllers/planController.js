const MembershipPlan = require('../models/MembershipPlan');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/plans
const getAllPlans = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.activeOnly === 'true') {
      filter.isActive = true;
    }
    const plans = await MembershipPlan.find(filter).sort({ price: 1 });
    return sendSuccess(res, 'Membership plans retrieved successfully', plans);
  } catch (err) {
    next(err);
  }
};

// GET /api/plans/:id
const getPlanById = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return sendError(res, 'Membership plan not found', 404, 'RESOURCE_NOT_FOUND');
    }
    return sendSuccess(res, 'Plan details retrieved', plan);
  } catch (err) {
    next(err);
  }
};

// POST /api/plans (Admin only)
const createPlan = async (req, res, next) => {
  try {
    const { name, durationMonths, price, description, features } = req.body;

    const existing = await MembershipPlan.findOne({ name });
    if (existing) {
      return sendError(res, `A membership plan named '${name}' already exists.`, 409, 'DUPLICATE_RESOURCE');
    }

    const plan = await MembershipPlan.create({
      name,
      durationMonths,
      price,
      description: description || '',
      features: features || [],
      isActive: true,
    });

    return sendSuccess(res, 'Membership plan created successfully', plan, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/plans/:id (Admin only)
const updatePlan = async (req, res, next) => {
  try {
    const { name, durationMonths, price, description, features, isActive } = req.body;

    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return sendError(res, 'Membership plan not found', 404, 'RESOURCE_NOT_FOUND');
    }

    if (name && name !== plan.name) {
      const duplicate = await MembershipPlan.findOne({ name, _id: { $ne: plan._id } });
      if (duplicate) {
        return sendError(res, `Another plan named '${name}' already exists.`, 409, 'DUPLICATE_RESOURCE');
      }
      plan.name = name;
    }

    if (durationMonths !== undefined) plan.durationMonths = durationMonths;
    if (price !== undefined) plan.price = price;
    if (description !== undefined) plan.description = description;
    if (features !== undefined) plan.features = features;
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();
    return sendSuccess(res, 'Membership plan updated successfully', plan);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/plans/:id (Admin only)
const deletePlan = async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) {
      return sendError(res, 'Membership plan not found', 404, 'RESOURCE_NOT_FOUND');
    }

    // Soft delete by setting isActive to false
    plan.isActive = false;
    await plan.save();

    return sendSuccess(res, 'Membership plan deactivated successfully', plan);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};