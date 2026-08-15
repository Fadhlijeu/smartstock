/**
 * test-db.js — Test DB setup & cleanup helper
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { runMigrations } = require('../../src/main/db/migrations/index');
const { setDb, closeDatabase } = require('../../src/main/db/db');

function createTestDatabase() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stockmon-test-'));
  const dbPath = path.join(tmpDir, 'test-stockmon.db');

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  const dummyLogger = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  };

  runMigrations(db, dummyLogger);
  setDb(db);

  return {
    db,
    dbPath,
    tmpDir,
    cleanup: () => {
      try {
        closeDatabase(dummyLogger);
      } catch {}
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch {}
    },
  };
}

module.exports = { createTestDatabase };
