const DashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateToken } = require('../middleware/auth');
const Progress = require('../models/Progress');

module.exports = {
  getDashboard: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const service = new DashboardService(req.user.id);
      const [profile, progress] = await Promise.all([
        service.getProfile(),
        service.getProgress()
      ]);

      res.json({
        success: true,
        profile,
        progress: progress.progress,
        analytics: progress.analytics
      });
    })
  ],

  getProgress: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const service = new DashboardService(req.user.id);
      const data = await service.getProgress();
      res.json({
        success: true,
        ...data
      });
    })
  ],

  updateProgress: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { examKey, progress, testsTaken, score, sections } = req.body;
      const service = new DashboardService(req.user.id);
      
      const updated = await service.updateProgress(examKey, {
        progress,
        testsTaken,
        score,
        sections,
        isDailyPractice: true
      });

      res.json({
        success: true,
        progress: updated,
        message: 'Progress updated'
      });
    })
  ],

  getTestHistory: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { examKey } = req.query;
      const service = new DashboardService(req.user.id);
      const history = await service.getTestHistory(examKey);
      
      res.json({
        success: true,
        history: history.map(h => h.toJSON())
      });
    })
  ],

  updateProfile: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const service = new DashboardService(req.user.id);
      const user = await service.updateProfile(req.body);
      
      res.json({
        success: true,
        user,
        message: 'Profile updated successfully'
      });
    })
  ]
};

