const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Items = require('./items');
const { UPLOAD_DIR, MAX_UPLOAD_MB } = require('./config');

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex')),
  }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 50 },
  defParamCharset: 'utf8',
});

// Types every modern browser can show in an <img>; anything else becomes a plain file.
const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/svg+xml',
]);

// Small text files dropped in become editable text items instead of opaque files.
const MAX_TEXT_FILE_BYTES = 1024 * 1024;
const TEXT_EXTENSIONS = new Set(
  'txt md markdown csv tsv log json jsonc xml yml yaml toml ini conf cfg env sql sh bash zsh ps1 bat py rb php js mjs cjs ts jsx tsx css scss html htm vue svelte c h cpp hpp cs java kt go rs swift lua r'.split(' ')
);

function readAsText(file) {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  if (file.size > MAX_TEXT_FILE_BYTES) return null;
  if (!file.mimetype.startsWith('text/') && !TEXT_EXTENSIONS.has(ext)) return null;

  const buffer = fs.readFileSync(file.path);
  if (buffer.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return null;
  }
}

function createFromUpload(file) {
  const text = readAsText(file);
  if (text !== null) {
    fs.rmSync(file.path, { force: true });
    return Items.create({ kind: 'text', title: file.originalname, content: text, size: Buffer.byteLength(text) });
  }

  const mime = file.mimetype || 'application/octet-stream';
  return Items.create({
    kind: IMAGE_TYPES.has(mime) ? 'image' : 'file',
    storedName: file.filename,
    originalName: file.originalname,
    mime,
    size: file.size,
  });
}

function sendStoredFile(req, res, row) {
  if (!row?.stored_name) return res.status(404).json({ error: 'File not found' });

  if (req.query.download !== undefined || row.kind !== 'image') {
    res.attachment(row.original_name);
  } else {
    res.set('Content-Disposition', 'inline');
  }
  res.set({
    'Content-Type': row.mime,
    'X-Content-Type-Options': 'nosniff',
    // Uploaded HTML/SVG must never run script on this origin.
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    'Cache-Control': 'private, max-age=31536000, immutable',
  });
  res.sendFile(row.stored_name, { root: UPLOAD_DIR });
}

function removeStoredFile(row) {
  if (row.stored_name) fs.rmSync(path.join(UPLOAD_DIR, row.stored_name), { force: true });
}

module.exports = { upload, createFromUpload, sendStoredFile, removeStoredFile };
