const ExamService = require('../services/examService');
const asyncHandler = require('../utils/asyncHandler');
const Progress = require('../models/Progress');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const aiGrader = require('../utils/aiGrader');

module.exports = {
  getExams: asyncHandler(async (req, res) => {
    const { category } = req.query;
    const exams = await ExamService.getExams(category ? { category } : {});
    res.json({
      success: true,
      count: exams.length,
      data: exams
    });
  }),

  getExam: asyncHandler(async (req, res) => {
    const exam = await ExamService.getExam(req.params.id);
    res.json({
      success: true,
      data: exam
    });
  }),

  createExam: [
    requireAdmin,
    asyncHandler(async (req, res) => {
      const exam = await ExamService.createExam(req.body);
      res.status(201).json({
        success: true,
        data: exam
      });
    })
  ],

  submitTest: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { examId, answers } = req.body;
      const results = await ExamService.submitTest(req.user.id, examId, answers);

      // Update user progress
      const progress = await Progress.findOneAndUpdate(
        { userId: req.user.id, examId },
        {
          $set: {
            score: results.totalScore,
            progress: results.percentage,
            testsTaken: { $inc: 1 },
            updatedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        results,
        progress: progress
      });
    })
  ]
};

