const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { DATA_DIR, UPLOAD_DIR } = require('./config');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'drop.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    kind          TEXT NOT NULL CHECK (kind IN ('text', 'image', 'file')),
    title         TEXT NOT NULL DEFAULT '',
    content       TEXT,
    stored_name   TEXT,
    original_name TEXT,
    mime          TEXT,
    size          INTEGER NOT NULL DEFAULT 0,
    share_slug    TEXT UNIQUE,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS items_created_at ON items (created_at DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value'
);

db.getSetting = (key) => getSettingStmt.get(key)?.value ?? null;
db.setSetting = (key, value) => setSettingStmt.run(key, value);

module.exports = db;
