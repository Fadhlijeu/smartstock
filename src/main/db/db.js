/**
 * db.js — SQLite connection & initialization untuk SAP StockMon
 * Singleton pattern, WAL mode, foreign keys enabled.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { runMigrations } = require('./migrations/index');

let _db = null;

/**
 * Get database file path (in app userData untuk portabilitas)
 * @returns {string}
 */
function getDbPath() {
  try {
    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'stockmon.db');
  } catch {
    // Fallback ke local data/ directory
    const dataDir = path.join(__dirname, '..', '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'stockmon.db');
  }
}

/**
 * Initialize database connection dan run migrations
 * @param {import('winston').Logger} logger
 * @returns {import('better-sqlite3').Database}
 */
function initDatabase(logger) {
  if (_db) {
    return _db;
  }

  const dbPath = getDbPath();
  logger.info('Opening database', { path: dbPath });

  try {
    _db = new Database(dbPath, {
      // verbose: isDev ? console.log : null,
    });

    // Performance + safety settings
    _db.pragma('journal_mode = WAL');       // Better concurrent performance
    _db.pragma('foreign_keys = ON');        // Enforce FK constraints
    _db.pragma('synchronous = NORMAL');     // Faster writes, still safe with WAL
    _db.pragma('cache_size = -16000');      // 16MB cache
    _db.pragma('temp_store = MEMORY');      // Temp tables in memory

    // Run migrations
    runMigrations(_db, logger);

    logger.info('Database initialized successfully');
    return _db;
  } catch (err) {
    logger.error('Failed to initialize database', { error: err.message, dbPath });
    throw err;
  }
}

/**
 * Get the database singleton
 * @returns {import('better-sqlite3').Database}
 */
function getDb() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

/**
 * Close database connection gracefully
 */
function closeDatabase(logger) {
  if (_db) {
    try {
      _db.close();
      _db = null;
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error closing database', { error: err.message });
    }
  }
}

module.exports = { initDatabase, getDb, closeDatabase };
