const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ['gym', 'class'],
      required: true,
      default: 'gym',
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    status: {
      type: String,
      enum: ['Approved', 'Present', 'Rejected'],
      default: 'Approved',
    },
    remarks: {
      type: String,
      default: 'Reviewed and confirmed by authorized role',
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Suggested index: { memberId: 1, date: -1 } for fast attendance history queries
attendanceSchema.index({ memberId: 1, date: -1 });
attendanceSchema.index({ classId: 1, memberId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);