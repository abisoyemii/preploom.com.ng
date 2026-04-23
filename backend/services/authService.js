const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { AppError } = require('../utils/errorHandler');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'preploom-jwt-secret-2026-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'preploom-refresh-secret';

class AuthService {
  async register(userData) {
    const { name, email, password } = userData;
    
    // Check existing
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      status: 'active'
    });

    return this.generateAuthTokens(user);
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password))) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('Account suspended', 403);
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return this.generateAuthTokens(user);
  }

  generateAuthTokens(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: user.toJSON()
    };
  }

  async refreshToken(token) {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+password');
    
    if (!user || user.status !== 'active') {
      throw new AppError('Invalid refresh token', 403);
    }

    return this.generateAuthTokens(user);
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return 'Password reset email sent';
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with resetToken
    console.log(`Reset token for ${email}: ${resetToken}`);

    return 'Password reset email sent';
  }

  async resetPassword(token, password) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Invalid or expired token', 400);
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return this.generateAuthTokens(user);
  }

  async verifyEmail(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return { message: 'Email verified successfully' };
  }
}

module.exports = new AuthService();

