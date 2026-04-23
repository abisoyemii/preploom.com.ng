const { body, validationResult, query } = require('express-validator');
const { isValidObjectId } = require('mongoose');

// Reusable validation chains
exports.registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

exports.loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .notEmpty()
    .withMessage('Password required')
];

exports.updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Current password required'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];

exports.examIdValidation = [
  body('examId')
    .isInt({ min: 1 })
    .withMessage('Valid exam ID required')
];

exports.enrollValidation = [
  body('examId')
    .isInt({ min: 1 })
    .withMessage('Valid exam ID required')
];

exports.progressValidation = [
  body()
    .custom((value) => {
      if (!value || typeof value !== 'object') return false;
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'object' && val.progress !== undefined) {
          if (typeof val.progress !== 'number' || val.progress < 0 || val.progress > 100) {
            return false;
          }
        }
      }
      return true;
    })
    .withMessage('Progress must be valid numbers (0-100)')
];

exports.contactValidation = [
  body('firstName').trim().notEmpty().isLength({ max: 50 }).withMessage('First name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('message').trim().notEmpty().isLength({ max: 2000 }).withMessage('Message required (max 2000 chars)')
];

exports.subscribeValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('name').optional().trim().isLength({ max: 100 })
];

// MongoDB ID validation
exports.mongoIdValidation = [
  body('id').custom((value) => isValidObjectId(value)).withMessage('Invalid MongoDB ID')
];

// Result handler (reusable)
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array({ onlyFirstError: true })
    });
  }
  next();
};

// Query param validation (exams filtering)
exports.examQueryValidation = [
  query('category').optional().isLength({ max: 50 }),
  query('search').optional().isLength({ max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

