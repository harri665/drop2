const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Note = require('../models/Note');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = IMAGE_TYPES.includes(file.mimetype)
      ? path.join(__dirname, '../uploads/images')
      : path.join(__dirname, '../uploads/files');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const isImage = IMAGE_TYPES.includes(req.file.mimetype);
    const note = await Note.create({
      type: isImage ? 'image' : 'file',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      title: req.file.originalname,
      content: ''
    });
    req.io.emit('note:created', note);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/download/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || !note.filename) return res.status(404).json({ error: 'Not found' });

    const subdir = note.type === 'image' ? 'images' : 'files';
    const filePath = path.resolve(path.join(__dirname, '../uploads', subdir, note.filename));
    const uploadsRoot = path.resolve(path.join(__dirname, '../uploads'));

    // Path traversal protection
    if (!filePath.startsWith(uploadsRoot)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.download(filePath, note.originalName);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/view/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || !note.filename) return res.status(404).json({ error: 'Not found' });

    const subdir = note.type === 'image' ? 'images' : 'files';
    const filePath = path.resolve(path.join(__dirname, '../uploads', subdir, note.filename));
    const uploadsRoot = path.resolve(path.join(__dirname, '../uploads'));

    if (!filePath.startsWith(uploadsRoot)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.sendFile(filePath);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
