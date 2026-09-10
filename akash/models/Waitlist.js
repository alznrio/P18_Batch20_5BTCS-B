const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'promoted', 'cancelled'],
      default: 'waiting',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

waitlistSchema.index({ classId: 1, status: 1, position: 1 });
waitlistSchema.index({ classId: 1, memberId: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);