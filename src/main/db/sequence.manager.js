/**
 * sequence.manager.js — QR ID Sequence Generator
 * Format: QR-YYYY-NNNN (contoh: QR-2026-0001)
 * Menggunakan tabel qr_sequences di SQLite untuk tracking counter.
 */

'use strict';

const { getDb } = require('./db');

const PREFIX = 'QR';
const SERIAL_PREFIX_BY_CATEGORY = new Map([
  ['Mechanical/Fastener', 'FAST'],
  ['Mechanical/Bearing', 'BEAR'],
  ['Mechanical/Seal', 'SEAL'],
  ['Mechanical/Pipe', 'PIPE'],
  ['Mechanical/Pipe & Fitting', 'PIPE'],
  ['Mechanical/Belt & Chain', 'DRIV'],
  ['Electrical/Cable', 'CABL'],
  ['Electrical/Component', 'ELEC'],
  ['Electrical/Panel', 'PANEL'],
  ['Instrument', 'INST'],
  ['Instrument/Pressure', 'PRES'],
  ['Instrument/Flow', 'FLOW'],
  ['Consumable', 'CONS'],
  ['Consumable/Lubricant', 'LUBE'],
  ['Consumable/Chemical', 'CHEM'],
  ['Tool', 'TOOL'],
  ['Safety', 'SAFE'],
]);

/**
 * Generate QR ID berikutnya untuk tahun berjalan.
 * Atomik — menggunakan SQLite transaction supaya tidak ada race condition.
 *
 * @param {string|null} year - Override tahun (opsional, default current year)
 * @returns {string} QR ID, contoh: "QR-2026-0001"
 */
function nextQrId(year = null) {
  const db = getDb();
  const y = Number(year || new Date().getFullYear());

  // Cek apakah row untuk tahun ini sudah ada
  const upsertSeq = db.transaction(() => {
    const existing = db.prepare(
      'SELECT last_seq FROM qr_sequences WHERE year = ?'
    ).get(y);

    let next;
    if (!existing) {
      // Buat row baru untuk tahun ini
      db.prepare(
        'INSERT INTO qr_sequences (year, last_seq, updated_at) VALUES (?, 1, ?)'
      ).run(y, new Date().toISOString());
      next = 1;
    } else {
      next = existing.last_seq + 1;
      db.prepare(
        'UPDATE qr_sequences SET last_seq = ?, updated_at = ? WHERE year = ?'
      ).run(next, new Date().toISOString(), y);
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
  const y = Number(year || new Date().getFullYear());
  const existing = db.prepare(
    'SELECT last_seq FROM qr_sequences WHERE year = ?'
  ).get(y);
  const next = existing ? existing.last_seq + 1 : 1;
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

function serialPrefixFor(data = {}) {
  const category = data.category || 'Uncategorized';
  if (SERIAL_PREFIX_BY_CATEGORY.has(category)) {
    return SERIAL_PREFIX_BY_CATEGORY.get(category);
  }

  const rootCategory = String(category).split('/')[0];
  if (SERIAL_PREFIX_BY_CATEGORY.has(rootCategory)) {
    return SERIAL_PREFIX_BY_CATEGORY.get(rootCategory);
  }

  const text = String(data.description || '').toLowerCase();
  if (/\b(baut|bolt|screw|mur|nut|ring|washer)\b/.test(text)) return 'FAST';
  if (/\b(bearing|laher)\b/.test(text)) return 'BEAR';
  if (/\b(kabel|cable|wire)\b/.test(text)) return 'CABL';
  if (/\b(panel|mcb|relay|sensor|motor)\b/.test(text)) return 'ELEC';
  if (/\b(oli|oil|grease|pelumas)\b/.test(text)) return 'LUBE';
  if (/\b(kunci|obeng|tang|tool|gerinda|bor)\b/.test(text)) return 'TOOL';

  return 'ITEM';
}

function nextSerialNumber(data = {}, year = null) {
  const db = getDb();
  const y = Number(year || new Date().getFullYear());
  const prefix = serialPrefixFor(data);
  const like = `${prefix}-${y}-%`;
  const rows = db.prepare(
    'SELECT serial_number FROM parts WHERE serial_number LIKE ?'
  ).all(like);

  const maxSeq = rows.reduce((max, row) => {
    const match = String(row.serial_number || '').match(/-(\d+)$/);
    if (!match) return max;
    const num = Number(match[1]);
    return Number.isFinite(num) && num > max ? num : max;
  }, 0);

  return `${prefix}-${y}-${String(maxSeq + 1).padStart(4, '0')}`;
}

module.exports = { nextQrId, peekNextQrId, isQrIdTaken, nextSerialNumber, serialPrefixFor };
