const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const User = require('../models/User');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'preploom-jwt-secret-2026-change-in-production';

// Exact replica of server.js authenticateToken for zero-downtime migration
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // MongoDB lookup (with JSON fallback)
    if (db.connected) {
      try {
        const userDoc = await User.findById(new Types.ObjectId(user.id)).select('-password');
        if (!userDoc) return res.status(404).json({ message: 'User not found' });
        req.user = userDoc.toObject();
      } catch (error) {
        return res.status(500).json({ message: 'Database error' });
      }
    } else {
      // JSON fallback compatibility
      req.user = user;
    }

    next();
  });
};

// Admin role check
exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Token refresh (new feature)
exports.refreshToken = async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userDoc = await User.findById(new Types.ObjectId(decoded.id)).select('-password');
    if (!userDoc) return res.status(404).json({ message: 'User not found' });

    const newToken = jwt.sign({
      id: userDoc._id,
      email: userDoc.email,
      role: userDoc.role,
      name: userDoc.name
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token: newToken });
  } catch (err) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

