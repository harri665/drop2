const express = require('express');
const Items = require('../items');
const { upload, createFromUpload, sendStoredFile, removeStoredFile } = require('../storage');
const { broadcast } = require('../realtime');

const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const SLUG_RE = /^[A-Za-z0-9_-]{3,64}$/;

const router = express.Router();

function findItem(req, res) {
  const row = Items.get(req.params.id);
  if (!row) res.status(404).json({ error: 'Item not found' });
  return row;
}

function changed(row) {
  const item = Items.toJSON(row);
  broadcast('item:updated', item);
  return item;
}

router.get('/', (req, res) => {
  res.json(Items.all().map(Items.toJSON));
});

router.post('/text', (req, res) => {
  const { content, title = '' } = req.body ?? {};
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Text is empty' });
  }
  if (typeof title !== 'string') return res.status(400).json({ error: 'Invalid title' });
  if (Buffer.byteLength(content) > MAX_TEXT_BYTES) return res.status(413).json({ error: 'Text is too large' });

  const item = Items.toJSON(Items.create({ kind: 'text', title: title.trim(), content, size: Buffer.byteLength(content) }));
  broadcast('item:created', item);
  res.status(201).json(item);
});

router.post('/files', upload.array('files'), (req, res) => {
  const created = (req.files ?? []).map((file) => Items.toJSON(createFromUpload(file)));
  for (const item of created) broadcast('item:created', item);
  res.status(201).json(created);
});

router.patch('/:id', (req, res) => {
  const row = findItem(req, res);
  if (!row) return;

  const { title, content } = req.body ?? {};
  if (title !== undefined && typeof title !== 'string') return res.status(400).json({ error: 'Invalid title' });
  if (content !== undefined) {
    if (row.kind !== 'text') return res.status(400).json({ error: 'Only text can be edited' });
    if (typeof content !== 'string') return res.status(400).json({ error: 'Invalid text' });
    if (Buffer.byteLength(content) > MAX_TEXT_BYTES) return res.status(413).json({ error: 'Text is too large' });
  }

  res.json(changed(Items.update(row, { title: title?.trim(), content })));
});

router.delete('/:id', (req, res) => {
  const row = findItem(req, res);
  if (!row) return;

  Items.remove(row.id);
  removeStoredFile(row);
  broadcast('item:deleted', { id: row.id });
  res.status(204).end();
});

router.get('/:id/file', (req, res) => {
  const row = findItem(req, res);
  if (row) sendStoredFile(req, res, row);
});

// Creates the share link, or changes it. With no slug a random one is generated.
router.put('/:id/share', (req, res) => {
  const row = findItem(req, res);
  if (!row) return;

  const requested = req.body?.slug;
  let slug;
  if (requested === undefined || requested === null || requested === '') {
    slug = Items.newSlug();
  } else {
    if (typeof requested !== 'string' || !SLUG_RE.test(requested)) {
      return res.status(400).json({ error: 'Use 3–64 letters, numbers, - or _' });
    }
    const owner = Items.bySlug(requested);
    if (owner && owner.id !== row.id) return res.status(409).json({ error: 'That link is already taken' });
    slug = requested;
  }

  res.json(changed(Items.setSlug(row, slug)));
});

router.delete('/:id/share', (req, res) => {
  const row = findItem(req, res);
  if (row) res.json(changed(Items.setSlug(row, null)));
});

module.exports = router;
