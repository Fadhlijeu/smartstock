/**
 * db.test.js — Unit test for Database migrations, schema, and WAL mode
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('../helpers/test-db');
const { getDb } = require('../../src/main/db/db');

test('Database: schema initialization & migrations', async (t) => {
  const env = createTestDatabase();

  t.after(() => {
    env.cleanup();
  });

  await t.test('database instance is active and accessible via getDb()', () => {
    const db = getDb();
    assert.ok(db, 'Database should be accessible');
  });

  await t.test('pragma settings are correctly configured', () => {
    const db = getDb();
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    assert.equal(foreignKeys, 1, 'Foreign keys must be ON');

    const journalMode = db.pragma('journal_mode', { simple: true });
    assert.equal(journalMode.toLowerCase(), 'wal', 'Journal mode must be WAL');
  });

  await t.test('all required tables are created by migrations', () => {
    const db = getDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);

    const requiredTables = [
      'parts',
      'transactions',
      'categories',
      'classification_rules',
      'import_batches',
      'qr_sequences',
      'settings',
      'schema_migrations',
    ];

    for (const table of requiredTables) {
      assert.ok(tables.includes(table), `Table ${table} must exist in schema`);
    }
  });

  await t.test('default settings and categories are pre-seeded in migrations', () => {
    const db = getDb();
    const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
    assert.ok(settingsCount > 0, 'Settings should be pre-seeded');

    const categoriesCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
    assert.ok(categoriesCount > 0, 'Categories should be pre-seeded');
  });
});
