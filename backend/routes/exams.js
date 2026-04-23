const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public exam discovery
router.get('/', examController.getExams);
router.get('/:id', examController.getExam);

// Admin exam management
router.post('/', requireAdmin, examController.createExam);

// User test submission
router.post('/submit', authenticateToken, examController.submitTest);

module.exports = router;

