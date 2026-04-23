const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'essay', 'audio'],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: [String], // For MCQ
  correctAnswer: mongoose.Schema.Types.Mixed, // String/Object for MCQ, audio URL for audio
  points: {
    type: Number,
    default: 1
  },
  timeLimit: {
    type: Number,
    default: 60 // seconds
  },
  audioUrl: String // For audio questions
}, { _id: false });

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  timeLimit: Number,
  questions: [questionSchema],
  instructions: String
}, { _id: false });

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['ielts', 'toefl', 'gmat', 'pmp', 'aws', 'cisco'],
    required: true,
    lowercase: true
  },
  sections: [sectionSchema],
  totalTime: Number, // minutes
  totalQuestions: Number,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

examSchema.index({ category: 1 });
examSchema.index({ isActive: 1 });

module.exports = mongoose.model('Exam', examSchema);

