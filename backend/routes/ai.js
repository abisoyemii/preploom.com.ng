const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// POST /api/ai/essay - Text grading
router.post('/essay', aiController.gradeEssay);

// POST /api/ai/speaking - Audio grading (multipart)
router.post('/speaking', aiController.gradeSpeaking);

// POST /api/ai/questions - Generate practice questions
router.post('/questions', aiController.generateQuestions);

module.exports = router;

