const mongoose = require('mongoose');

const workoutDietNoteSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
    },
    targetGoals: {
      type: String,
      default: 'General fitness & endurance',
    },
    workoutNotes: {
      type: String,
      required: [true, 'Workout plan notes are required'],
    },
    dietNotes: {
      type: String,
      required: [true, 'Diet plan notes are required'],
    },
  },
  {
    timestamps: true,
  }
);

workoutDietNoteSchema.index({ memberId: 1, createdAt: -1 });

module.exports = mongoose.model('WorkoutDietNote', workoutDietNoteSchema);