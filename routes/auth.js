const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Config = require('../models/Config');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, try again in 15 minutes' }
});

// POST /api/auth/login  { sequence: "1,5,9" }
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { sequence } = req.body;
    if (!sequence || typeof sequence !== 'string') {
      return res.status(400).json({ error: 'Invalid sequence' });
    }

    const config = await Config.findOne({ key: 'gridHash' });
    if (!config) return res.status(500).json({ error: 'Server not configured' });

    const match = await bcrypt.compare(sequence, config.value);
    if (!match) return res.status(401).json({ error: 'Invalid pattern' });

    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-pattern  { currentSequence, newSequence }
router.post('/change-pattern', authMiddleware, loginLimiter, async (req, res) => {
  try {
    const { currentSequence, newSequence } = req.body;
    if (!currentSequence || !newSequence) {
      return res.status(400).json({ error: 'Missing sequences' });
    }

    const config = await Config.findOne({ key: 'gridHash' });
    const match = await bcrypt.compare(currentSequence, config.value);
    if (!match) return res.status(401).json({ error: 'Current pattern incorrect' });

    const hash = await bcrypt.hash(newSequence, 12);
    await Config.updateOne({ key: 'gridHash' }, { value: hash });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
