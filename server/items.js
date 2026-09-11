const crypto = require('crypto');
const db = require('./db');

const stmts = {
  all: db.prepare('SELECT * FROM items ORDER BY created_at DESC'),
  get: db.prepare('SELECT * FROM items WHERE id = ?'),
  bySlug: db.prepare('SELECT * FROM items WHERE share_slug = ?'),
  insert: db.prepare(`
    INSERT INTO items (id, kind, title, content, stored_name, original_name, mime, size, created_at, updated_at)
    VALUES (@id, @kind, @title, @content, @stored_name, @original_name, @mime, @size, @created_at, @updated_at)
  `),
  update: db.prepare(
    'UPDATE items SET title = @title, content = @content, size = @size, updated_at = @updated_at WHERE id = @id'
  ),
  setSlug: db.prepare('UPDATE items SET share_slug = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM items WHERE id = ?'),
};

const newId = () => crypto.randomBytes(9).toString('base64url');
const newSlug = () => crypto.randomBytes(6).toString('base64url');

function create({ kind, title = '', content = null, storedName = null, originalName = null, mime = null, size = 0 }) {
  const now = Date.now();
  const id = newId();
  stmts.insert.run({
    id,
    kind,
    title,
    content,
    stored_name: storedName,
    original_name: originalName,
    mime,
    size,
    created_at: now,
    updated_at: now,
  });
  return stmts.get.get(id);
}

function update(row, { title = row.title, content = row.content }) {
  const size = row.kind === 'text' ? Buffer.byteLength(content ?? '') : row.size;
  stmts.update.run({ id: row.id, title, content, size, updated_at: Date.now() });
  return stmts.get.get(row.id);
}

function setSlug(row, slug) {
  stmts.setSlug.run(slug, row.id);
  return stmts.get.get(row.id);
}

// Shape sent to the signed-in owner.
function toJSON(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: row.kind === 'text' ? row.content : undefined,
    name: row.original_name,
    mime: row.mime,
    size: row.size,
    shareSlug: row.share_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Shape sent to anyone holding a share link — no internal ids.
function toPublicJSON(row) {
  const { id, shareSlug, ...rest } = toJSON(row);
  return rest;
}

module.exports = {
  all: () => stmts.all.all(),
  get: (id) => stmts.get.get(id),
  bySlug: (slug) => stmts.bySlug.get(slug),
  remove: (id) => stmts.remove.run(id),
  create,
  update,
  setSlug,
  newSlug,
  toJSON,
  toPublicJSON,
};
