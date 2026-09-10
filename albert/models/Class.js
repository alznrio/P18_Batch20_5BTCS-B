const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainer ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Class title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['Yoga', 'HIIT', 'Strength', 'Spinning', 'CrossFit', 'Pilates', 'Boxing', 'General'],
      default: 'General',
    },
    schedule: {
      type: Date,
      required: [true, 'Schedule start time is required'],
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity limit is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    waitlistCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    room: {
      type: String,
      default: 'Main Studio',
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

// Suggested index: { trainerId: 1 } for fast relational lookups & schedule filtering
classSchema.index({ trainerId: 1, schedule: 1 });

module.exports = mongoose.model('Class', classSchema);