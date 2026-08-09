/**
 * migrations/index.js — Migration runner untuk SAP StockMon
 * Menjalankan SQL migrations secara incremental, version-tracked.
 */

const path = require('path');
const fs = require('fs');

// Daftar semua migrations secara berurutan
const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema — parts, transactions, categories, settings, qr_sequences',
    file: '001_initial.sql',
  },
  // Tambah di sini jika ada migration baru:
  // { version: 2, description: 'Add part images', file: '002_add_images.sql' },
];

/**
 * Jalankan semua pending migrations
 * @param {import('better-sqlite3').Database} db
 * @param {import('winston').Logger} logger
 */
function runMigrations(db, logger) {
  // Pastikan tabel tracker ada (bootstrap)
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at  TEXT NOT NULL
    )
  `);

  // Ambil versi yang sudah diapply
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );

  const migrationsDir = path.join(__dirname);
  let ran = 0;

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) {
      continue;
    }

    logger.info(`Running migration v${migration.version}: ${migration.description}`);

    const sqlPath = path.join(migrationsDir, migration.file);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
      // Jalankan dalam satu transaction untuk atomicity
      db.exec(sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.description, new Date().toISOString());

      logger.info(`Migration v${migration.version} applied successfully`);
      ran++;
    } catch (err) {
      logger.error(`Migration v${migration.version} FAILED`, { error: err.message });
      throw err; // Fatal — app tidak boleh jalan dengan DB rusak
    }
  }

  if (ran === 0) {
    logger.info('Database schema is up to date, no migrations needed');
  } else {
    logger.info(`Applied ${ran} migration(s) successfully`);
  }
}

module.exports = { runMigrations };
