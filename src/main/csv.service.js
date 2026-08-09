/**
 * csv.service.js — CSV Import Service untuk M1
 * Parse, validasi, dan batch insert dari file CSV.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const partsRepo = require('./db/parts.repository');

// ─── TEMPLATE COLUMNS ────────────────────────────────────────────────────────
// Urutan kolom di template CSV yang disediakan ke user
const TEMPLATE_COLUMNS = [
  'date_entry',
  'mr_invoice',
  'purchase_order',
  'serial_number',
  'description',
  'initial_qty',
  'unit',
  'min_qty',
  'category',
];

// ─── VALIDATION RULES ────────────────────────────────────────────────────────
const REQUIRED_FIELDS = ['date_entry', 'mr_invoice', 'purchase_order', 'serial_number', 'description', 'initial_qty'];

const VALID_UNITS = ['pcs', 'meter', 'kg', 'set', 'liter', 'box', 'roll', 'batang', 'lembar', 'unit', 'buah', 'pak', 'pasang'];

/**
 * Generate CSV template content
 * @returns {string} CSV string
 */
function generateTemplate() {
  const header = TEMPLATE_COLUMNS.join(',');
  const example = [
    '2026-08-09',
    'INV-2026-0001',
    'PO-2026-0001',
    'BOLT-M10-001',
    'Baut M10 x 25mm Stainless',
    '100',
    'pcs',
    '10',
    'Mechanical/Fastener',
  ].join(',');

  const comments = [
    '# Template CSV Import SAP StockMon',
    '# Kolom wajib: date_entry, mr_invoice, purchase_order, serial_number, description, initial_qty',
    '# Kolom opsional: unit (default: pcs), min_qty (default: 0), category (default: Uncategorized)',
    '# Format tanggal: YYYY-MM-DD',
    '# Unit valid: pcs, meter, kg, set, liter, box, roll, batang, lembar, unit, buah, pak, pasang',
    '#',
    '# Hapus baris komentar (#) sebelum import',
  ].join('\n');

  return `${comments}\n${header}\n${example}\n`;
}

/**
 * Parse dan validasi CSV file
 * @param {string} filePath - Absolute path ke file CSV
 * @returns {{ rows: Object[], errors: Object[], totalRows: number }}
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Strip comment lines
  const filtered = content
    .split('\n')
    .filter((line) => !line.trim().startsWith('#') && line.trim() !== '')
    .join('\n');

  let records;
  try {
    records = parse(filtered, {
      columns: true,           // Use first row as headers
      skip_empty_lines: true,
      trim: true,
      bom: true,               // Handle BOM dari Excel
    });
  } catch (err) {
    throw new Error(`Format CSV tidak valid: ${err.message}`);
  }

  const rows = [];
  const errors = [];

  records.forEach((record, idx) => {
    const rowNum = idx + 2; // +2 karena header adalah row 1
    const rowErrors = [];

    // ── Required field check ──
    for (const field of REQUIRED_FIELDS) {
      if (!record[field] || String(record[field]).trim() === '') {
        rowErrors.push(`Kolom '${field}' wajib diisi`);
      }
    }

    // ── Type validations ──
    const qty = parseInt(record.initial_qty);
    if (isNaN(qty) || qty < 0) {
      rowErrors.push(`initial_qty harus angka positif (dapat: '${record.initial_qty}')`);
    }

    const minQty = parseInt(record.min_qty || '0');
    if (isNaN(minQty) || minQty < 0) {
      rowErrors.push(`min_qty harus angka positif (dapat: '${record.min_qty}')`);
    }

    // ── Date format check ──
    if (record.date_entry && !/^\d{4}-\d{2}-\d{2}$/.test(record.date_entry.trim())) {
      rowErrors.push(`date_entry harus format YYYY-MM-DD (dapat: '${record.date_entry}')`);
    }

    // ── Unit check ──
    const unit = (record.unit || 'pcs').toLowerCase().trim();
    if (!VALID_UNITS.includes(unit)) {
      // Warning, bukan error — auto-fallback ke 'pcs'
    }

    // ── Duplicate serial number check dalam batch ──
    const sn = (record.serial_number || '').trim();
    const isDupInBatch = rows.some((r) => r.serialNumber === sn);
    if (sn && isDupInBatch) {
      rowErrors.push(`serial_number '${sn}' duplikat dalam file CSV`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, serialNumber: sn, errors: rowErrors });
    } else {
      rows.push({
        dateEntry: record.date_entry.trim(),
        mrInvoice: record.mr_invoice.trim(),
        purchaseOrder: record.purchase_order.trim(),
        serialNumber: sn,
        description: record.description.trim(),
        initialQty: qty,
        unit: VALID_UNITS.includes(unit) ? unit : 'pcs',
        minQty: isNaN(minQty) ? 0 : minQty,
        category: (record.category || 'Uncategorized').trim(),
        snSource: 'csv',
      });
    }
  });

  return { rows, errors, totalRows: records.length };
}

/**
 * Batch insert rows ke DB dengan transaction
 * @param {Object[]} rows - Validated rows dari parseCSV
 * @param {Function} onProgress - Callback (current, total)
 * @returns {{ inserted: number, duplicates: string[], failed: Object[] }}
 */
function batchInsert(rows, onProgress) {
  const { getDb } = require('./db/db');
  const db = getDb();

  let inserted = 0;
  const duplicates = [];
  const failed = [];

  // Semua insert dalam satu SQLite transaction untuk atomicity + speed
  const importTx = db.transaction(() => {
    rows.forEach((row, idx) => {
      const res = partsRepo.createPart(row);
      if (res.success) {
        inserted++;
      } else if (res.error.code === 'DUPLICATE_SERIAL') {
        duplicates.push(row.serialNumber);
      } else {
        failed.push({ serialNumber: row.serialNumber, error: res.error.message });
      }

      if (onProgress && idx % 10 === 0) {
        onProgress(idx + 1, rows.length);
      }
    });
  });

  importTx();

  return { inserted, duplicates, failed };
}

module.exports = { generateTemplate, parseCSV, batchInsert, TEMPLATE_COLUMNS };
