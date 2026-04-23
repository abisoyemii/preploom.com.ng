const authService = require('../services/authService');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { validate } = require('../middleware/validation');
const { asyncHandler } = require('../utils/asyncHandler');

module.exports = {
  register: [
    registerValidation,
    validate,
    asyncHandler(async (req, res) => {
      const { name, email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.register({ name, email, password });
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user,
        tokens: { accessToken, refreshToken }
      });
    })
  ],

  login: [
    loginValidation,
    validate,
    asyncHandler(async (req, res) => {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);
      res.json({
        success: true,
        message: 'Login successful',
        user,
        tokens: { accessToken, refreshToken }
      });
    })
  ],

  refresh: asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { accessToken, refreshToken, user } = await authService.refreshToken(token);
    res.json({
      success: true,
      user,
      tokens: { accessToken, refreshToken }
    });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;
    const message = await authService.forgotPassword(email);
    res.json({ message });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    res.json(result);
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const { token } = req.params;
    const result = await authService.verifyEmail(token);
    res.json(result);
  })
};

