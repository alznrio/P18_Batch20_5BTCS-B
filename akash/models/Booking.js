const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['booked', 'cancelled', 'attended'],
      default: 'booked',
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Suggested index: { classId: 1 } and compound index for fast duplicate checks
bookingSchema.index({ classId: 1, memberId: 1 });
bookingSchema.index({ memberId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);