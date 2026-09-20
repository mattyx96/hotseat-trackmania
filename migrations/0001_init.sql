-- Cloud-saved hotseat sessions. No auth: the short `code` is the capability.
CREATE TABLE IF NOT EXISTS sessions (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  data       TEXT NOT NULL, -- JSON: { session, players }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
