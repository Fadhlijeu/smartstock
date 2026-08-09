/**
 * sequence.manager.js — QR ID Sequence Generator
 * Format: QR-YYYY-NNNN (contoh: QR-2026-0001)
 * Menggunakan tabel qr_sequences di SQLite untuk tracking counter.
 */

'use strict';

const { getDb } = require('./db');

const PREFIX = 'QR';

/**
 * Generate QR ID berikutnya untuk tahun berjalan.
 * Atomik — menggunakan SQLite transaction supaya tidak ada race condition.
 *
 * @param {string|null} year - Override tahun (opsional, default current year)
 * @returns {string} QR ID, contoh: "QR-2026-0001"
 */
function nextQrId(year = null) {
  const db = getDb();
  const y = year || new Date().getFullYear().toString();

  // Cek apakah row untuk tahun ini sudah ada
  const upsertSeq = db.transaction(() => {
    const existing = db.prepare(
      'SELECT last_number FROM qr_sequences WHERE prefix = ? AND year = ?'
    ).get(PREFIX, y);

    let next;
    if (!existing) {
      // Buat row baru untuk tahun ini
      db.prepare(
        'INSERT INTO qr_sequences (prefix, year, last_number) VALUES (?, ?, 1)'
      ).run(PREFIX, y);
      next = 1;
    } else {
      next = existing.last_number + 1;
      db.prepare(
        'UPDATE qr_sequences SET last_number = ? WHERE prefix = ? AND year = ?'
      ).run(next, PREFIX, y);
    }

    return next;
  });

  const num = upsertSeq();
  return `${PREFIX}-${y}-${String(num).padStart(4, '0')}`;
}

/**
 * Peek — lihat QR ID berikutnya tanpa mengkonsumsinya
 * @param {string|null} year
 * @returns {string}
 */
function peekNextQrId(year = null) {
  const db = getDb();
  const y = year || new Date().getFullYear().toString();
  const existing = db.prepare(
    'SELECT last_number FROM qr_sequences WHERE prefix = ? AND year = ?'
  ).get(PREFIX, y);
  const next = existing ? existing.last_number + 1 : 1;
  return `${PREFIX}-${y}-${String(next).padStart(4, '0')}`;
}

/**
 * Check apakah QR ID sudah ada di tabel parts
 * @param {string} qrId
 * @returns {boolean}
 */
function isQrIdTaken(qrId) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM parts WHERE qr_id = ?').get(qrId);
  return !!row;
}

module.exports = { nextQrId, peekNextQrId, isQrIdTaken };
