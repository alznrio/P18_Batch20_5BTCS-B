const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    paymentReference: {
      type: String,
      default: () => 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
    autoRenewal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Suggested index: { memberId: 1 } for fast relational lookups
membershipSchema.index({ memberId: 1, status: 1 });

module.exports = mongoose.model('Membership', membershipSchema);