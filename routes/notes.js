const express = require('express');
const Note = require('../models/Note');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const notes = await Note.find().sort({ updatedAt: -1 });
    console.log(`[GET /api/notes] Returning ${notes.length} notes`);
    res.json(notes);
  } catch (err) {
    console.error('[GET /api/notes] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { content, title, type } = req.body;
    console.log('[POST /api/notes] Creating note:', { content: content?.slice(0, 20), title, type });
    const note = await Note.create({ content, title, type: type || 'text' });
    console.log('[POST /api/notes] Created note ID:', note._id);
    req.io.emit('note:created', note);
    res.status(201).json(note);
  } catch (err) {
    console.error('[POST /api/notes] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { content, title } = req.body;
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { content, title, updatedAt: new Date() },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Not found' });
    req.io.emit('note:updated', note);
    res.json(note);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'Not found' });
    // Clean up share if exists
    const Share = require('../models/Share');
    await Share.deleteMany({ noteId: req.params.id });
    req.io.emit('note:deleted', { id: req.params.id });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
