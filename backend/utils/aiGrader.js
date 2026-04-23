/**
 * AI-Powered Exam Grading System
 * Features: Answer analysis, band score prediction (IELTS), pass probability (PMP/CCNA)
 */

class AIGrader {
  constructor() {
    // Mock AI models - replace with OpenAI/Gemini integration
    this.bandScoreWeights = {
      ielts: { reading: 0.25, listening: 0.25, writing: 0.25, speaking: 0.25 },
      toefl: { reading: 0.25, listening: 0.25, speaking: 0.25, writing: 0.25 }
    };
  }

  gradeAnswer({ examType, section, userAnswer, correctAnswer, timeTaken, questionDifficulty = 1 }) {
    let score = 0;
    let feedback = '';
    
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    
    if (isCorrect) {
      score = Math.max(0, 1 - (timeTaken / 90) * 0.2) * questionDifficulty * 10;
      feedback = 'Correct! ';
    } else {
      score = 0;
      feedback = `Incorrect. Correct: "${correctAnswer}" `;
    }

    return {
      score: Math.round(score * 10) / 10,
      isCorrect,
      feedback,
      timeBonus: timeTaken <= 60 ? '+0.5' : '0'
    };
  }

  calculateBandScore(sections, examType) {
    const weights = this.bandScoreWeights[examType] || { overall: 1 };
    let totalScore = 0;
    let weightedSum = 0;

    for (const [sectionName, weight] of Object.entries(weights)) {
      const sectionScore = sections[sectionName]?.avgScore || 0;
      weightedSum += sectionScore * weight;
      totalScore += sectionScore;
    }

    // IELTS-style band score (0-9)
    const bandScore = Math.round((weightedSum / Object.keys(weights).length) / 11.11);
    
    return {
      bandScore: Math.max(0, Math.min(9, bandScore)),
      overallPercentage: Math.round((totalScore / Object.keys(sections).length) || 0),
      recommendation: this.getRecommendation(bandScore, examType)
    };
  }

  getRecommendation(bandScore, examType) {
    if (examType === 'ielts') {
      if (bandScore >= 7) return '🎯 Target achieved! Focus on consistency.';
      if (bandScore >= 6) return '📈 Good progress. Practice time management.';
      return '📚 Build vocabulary + practice daily.';
    }
    
    if (examType === 'pmp') {
      return bandScore >= 70 ? '✅ Likely to pass!' : '📖 Review PMBOK weak areas.';
    }

    return 'Continue practicing with timed tests.';
  }

  // Mock AI essay grader (IELTS/TOEFL Task 2)
  gradeEssay({ text, examType, wordCount }) {
    const wc = (text.match(/\\w+/g) || []).length;
    const ideas = text.toLowerCase().includes('however') || text.toLowerCase().includes('furthermore') ? 2 : 1;
    const vocab = new Set(text.toLowerCase().match(/\\b\\w{6,}\\b/g) || []).size / 10;
    const grammar = text.split('.').length > 8 ? 2 : 1;

    const score = Math.min(9, (ideas + vocab + grammar) * 1.5);
    
    return {
      score: Math.round(score * 10) / 10,
      criteria: {
        taskResponse: ideas,
        coherence: 2,
        lexical: Math.min(3, vocab),
        grammar: grammar
      },
      feedback: `Word count: ${wc}. Use more complex structures + varied vocabulary.`
    };
  }
}

module.exports = new AIGrader();

