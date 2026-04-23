const Exam = require('../models/Exam');
const { AppError } = require('../utils/errorHandler');
const aiGrader = require('../utils/aiGrader');

class ExamService {
  static async getExams(filter = {}) {
    const query = { isActive: true, ...filter };
    return await Exam.find(query).lean();
  }

  static async getExam(id) {
    const exam = await Exam.findById(id);
    if (!exam) throw new AppError('Exam not found', 404);
    return exam;
  }

  static async createExam(examData) {
    // Admin only
    const exam = new Exam(examData);
    await exam.validate();
    return await exam.save();
  }

  static async submitTest(userId, examId, answers) {
    const exam = await this.getExam(examId);
    const results = [];

    let totalScore = 0;
    let sectionScores = {};

    exam.sections.forEach((section, sectionIndex) => {
      sectionScores[section.name] = { score: 0, total: 0 };
      
      section.questions.forEach((question, qIndex) => {
        const userAnswer = answers[sectionIndex]?.[qIndex];
        if (!userAnswer) return;

        let score = 0;
        let feedback = '';

        if (question.type === 'mcq') {
          score = userAnswer === question.correctAnswer ? question.points : 0;
        } else if (question.type === 'essay') {
          const grade = aiGrader.gradeEssay({
            text: userAnswer,
            examType: exam.category
          });
          score = grade.score;
          feedback = grade.feedback;
        } else if (question.type === 'audio') {
          // TODO: Audio analysis
          score = 8.5; // Mock
        }

        totalScore += score;
        sectionScores[section.name].score += score;
        sectionScores[section.name].total += question.points;

        results.push({
          questionId: qIndex,
          type: question.type,
          score,
          feedback,
          timeUsed: 60 // From frontend timer
        });
      });
    });

    const percentage = Math.round((totalScore / exam.totalQuestions) * 100);
    
    return {
      exam: exam._id,
      totalScore,
      percentage,
      sectionScores,
      results,
      bandScore: aiGrader.calculateBandScore(sectionScores, exam.category).bandScore
    };
  }
}

module.exports = ExamService;

