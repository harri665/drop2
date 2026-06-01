const express = require('express');
const path = require('path');
const Share = require('../models/Share');
const Note = require('../models/Note');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/shares - list all shares (auth required)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const shares = await Share.find().populate('noteId').sort({ createdAt: -1 });
    res.json(shares);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shares  { noteId, slug }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { noteId, slug } = req.body;
    if (!noteId || !slug) return res.status(400).json({ error: 'noteId and slug required' });

    // Sanitize slug
    const cleanSlug = slug.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 80);
    if (!cleanSlug) return res.status(400).json({ error: 'Invalid slug' });

    const note = await Note.findById(noteId);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const existing = await Share.findOne({ slug: cleanSlug });
    if (existing) return res.status(409).json({ error: 'Slug already taken' });

    const share = await Share.create({ slug: cleanSlug, type: note.type, noteId });
    res.status(201).json(share);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/shares/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Share.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /s/:slug - public landing page (served by express static for HTML, this returns data)
router.get('/public/:slug', async (req, res) => {
  try {
    const share = await Share.findOne({ slug: req.params.slug }).populate('noteId');
    if (!share || !share.noteId) return res.status(404).json({ error: 'Not found' });
    res.json({ share, note: share.noteId });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
