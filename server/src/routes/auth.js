import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smartsyllabus-secret-change-in-production';

const generateToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Registration attempt for:", email);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.log("User already exists:", email);
      return res.status(400).json({ message: 'User already exists. Please sign in instead.' });
    }

    const user = await User.create({ email: email.toLowerCase().trim(), password });
    console.log("User created successfully:", user._id);

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { email: user.email, name: user.name }
    });
  } catch (err) {
    console.error("CRITICAL REGISTRATION ERROR:", err);
    res.status(500).json({
      message: 'Registration failed',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = generateToken(user._id);
    res.json({
      token,
      user: { email: user.email, name: user.name }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Login failed' });
  }
});

export default router;
