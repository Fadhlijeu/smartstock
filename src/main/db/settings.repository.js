/**
 * settings.repository.js — CRUD untuk tabel `settings`
 * Key-value store dengan JSON-encoded values.
 */

const { getDb } = require('./db');

function now() {
  return new Date().toISOString();
}

/**
 * Ambil satu setting berdasarkan key
 * @param {string} key
 * @returns {{ success: boolean, data?: any, error?: Object }}
 */
function getSetting(key) {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Setting tidak ditemukan: ${key}` } };
    }
    return { success: true, data: JSON.parse(row.value) };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Set satu setting
 * @param {string} key
 * @param {any} value — akan di-JSON.stringify
 */
function setSetting(key, value) {
  try {
    const db = getDb();
    const jsonValue = JSON.stringify(value);
    const timestamp = now();

    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, jsonValue, timestamp);

    return { success: true, data: value };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Ambil semua settings sebagai object
 * @returns {{ success: boolean, data?: Object }}
 */
function getAllSettings() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Update multiple settings sekaligus
 * @param {Object} updates — { key: value, ... }
 */
function updateSettings(updates) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    const timestamp = now();
    const updateMany = db.transaction((entries) => {
      for (const [key, value] of entries) {
        stmt.run(key, JSON.stringify(value), timestamp);
      }
    });

    updateMany(Object.entries(updates));
    return { success: true, data: updates };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

module.exports = { getSetting, setSetting, getAllSettings, updateSettings };
