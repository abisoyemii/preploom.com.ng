const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  examId: {
    type: Number, // Existing JSON exam IDs
    required: true,
    index: true
  },
  examKey: {
    type: String, // 'ielts', 'toefl', 'pmp', etc.
    required: true,
    lowercase: true,
    index: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  testsTaken: {
    type: Number,
    default: 0,
    min: 0
  },
  score: {
    type: Number,
    min: 0,
    max: 1000
  },
  streak: {
    type: Number,
    default: 0,
    min: 0
  },
  sections: [{
    name: String,
    progress: { type: Number, default: 0 },
    completedTests: { type: Number, default: 0 },
    avgScore: Number
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for fast user+exam lookups
progressSchema.index({ userId: 1, examId: 1 });
progressSchema.index({ userId: 1, examKey: 1 });

// Virtual for JSON compatibility
progressSchema.virtual('id').get(function() {
  return this._id;
});

module.exports = mongoose.model('Progress', progressSchema);

