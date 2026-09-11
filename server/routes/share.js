const express = require('express');
const Items = require('../items');
const { sendStoredFile } = require('../storage');

// Public, read-only access to items that have a share link.
const router = express.Router();

router.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});

function findShared(req, res) {
  const row = Items.bySlug(req.params.slug);
  if (!row) res.status(404).json({ error: 'This link does not exist or has been turned off' });
  return row;
}

router.get('/:slug', (req, res) => {
  const row = findShared(req, res);
  if (row) res.json(Items.toPublicJSON(row));
});

router.get('/:slug/file', (req, res) => {
  const row = findShared(req, res);
  if (row) sendStoredFile(req, res, row);
});

module.exports = router;
