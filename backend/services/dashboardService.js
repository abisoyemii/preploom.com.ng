const User = require('../models/User');
const Progress = require('../models/Progress');
const { AppError } = require('../utils/errorHandler');

class DashboardService {
  constructor(userId) {
    this.userId = userId;
  }

  async getProfile() {
    const user = await User.findById(this.userId).select('-password');
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(updates) {
    const user = await User.findByIdAndUpdate(
      this.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    return user;
  }

  async getProgress() {
    const progress = await Progress.find({ userId: this.userId });
    
    // Calculate analytics
    const totalTests = progress.reduce((sum, p) => sum + p.testsTaken, 0);
    const avgScore = progress.reduce((sum, p) => sum + (p.score || 0), 0) / Math.max(progress.length, 1);
    const currentStreak = Math.max(...progress.map(p => p.streak), 0);
    
    const overallProgress = Math.round(
      progress.reduce((sum, p) => sum + p.progress, 0) / Math.max(progress.length, 1)
    );

    return {
      progress: progress.map(p => p.toJSON()),
      analytics: {
        totalTests,
        avgScore: Math.round(avgScore),
        currentStreak,
        overallProgress,
        enrolledExams: progress.length
      }
    };
  }

  async updateProgress(examKey, progressData) {
    const update = {
      progress: Math.min(100, Math.max(0, progressData.progress || 0)),
      testsTaken: (progressData.testsTaken || 0),
      score: progressData.score || 0,
      streak: this.calculateStreak(examKey, progressData),
      sections: progressData.sections || [],
      updatedAt: new Date()
    };

    const progress = await Progress.findOneAndUpdate(
      { userId: this.userId, examKey },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return progress;
  }

  calculateStreak(examKey, data) {
    // Simple streak logic - extend for daily practice
    return data.isDailyPractice ? 1 : 0;
  }

  async getTestHistory(examKey) {
    return await Progress.find({ userId: this.userId, examKey })
      .sort({ updatedAt: -1 })
      .limit(10);
  }
}

module.exports = DashboardService;

