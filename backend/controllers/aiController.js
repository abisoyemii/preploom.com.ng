const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = {
  gradeEssay: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { text, examType = 'ielts' } = req.body;
      const result = await aiService.gradeEssay(text, examType);
      
      res.json({
        success: true,
        ...result
      });
    })
  ],

  gradeSpeaking: [
    upload.single('audio'),
    authenticateToken,
    asyncHandler(async (req, res) => {
      if (!req.file) throw new Error('Audio file required');
      
      // Transcribe first
      const transcript = await aiService.transcribeAudio(req.file.buffer);
      
      // Then grade
      const result = await aiService.gradeSpeaking(transcript, req.body.examType || 'ielts');
      
      res.json({
        success: true,
        ...result,
        audioDuration: req.file.duration || 'unknown'
      });
    })
  ],

  generateQuestions: [
    authenticateToken,
    asyncHandler(async (req, res) => {
      const { examType, difficulty, numQuestions = 5 } = req.body;
      
      if (!examType || !difficulty) {
        return res.status(400).json({ success: false, error: 'examType and difficulty required' });
      }
      
      const result = await aiService.generateQuestions(examType.toLowerCase(), difficulty.toLowerCase(), parseInt(numQuestions));
      
      res.json({
        success: true,
        ...result
      });
    })
  ]
};



