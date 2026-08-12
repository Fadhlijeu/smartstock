/**
 * csv.service.js - CSV Import Service untuk SAP StockMon.
 * Parse, validasi, auto-classify, merge homogen sederhana, dan batch insert.
 */

'use strict';

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const partsRepo = require('./db/parts.repository');

const TEMPLATE_COLUMNS = [
  'Date',
  'MR Invoice',
  'Purchase Order',
  'Serial Number',
  'Quantity',
  'Unit',
  'Description',
  'Category (optional)',
  'Min Qty',
];

const REQUIRED_FIELDS = ['date_entry', 'mr_invoice', 'purchase_order', 'description', 'initial_qty'];
const VALID_UNITS = ['pcs', 'meter', 'kg', 'set', 'liter', 'box', 'roll', 'batang', 'lembar', 'unit', 'buah', 'pak', 'pasang'];

const HEADER_ALIASES = new Map([
  ['date', 'date_entry'],
  ['date entry', 'date_entry'],
  ['date_entry', 'date_entry'],
  ['tanggal', 'date_entry'],
  ['tanggal masuk', 'date_entry'],
  ['mr', 'mr_invoice'],
  ['mr invoice', 'mr_invoice'],
  ['mr_invoice', 'mr_invoice'],
  ['invoice', 'mr_invoice'],
  ['po', 'purchase_order'],
  ['purchase order', 'purchase_order'],
  ['purchase_order', 'purchase_order'],
  ['serial', 'serial_number'],
  ['serial number', 'serial_number'],
  ['serial_number', 'serial_number'],
  ['sn', 'serial_number'],
  ['qty', 'initial_qty'],
  ['quantity', 'initial_qty'],
  ['jumlah', 'initial_qty'],
  ['initial qty', 'initial_qty'],
  ['initial_qty', 'initial_qty'],
  ['unit', 'unit'],
  ['satuan', 'unit'],
  ['description', 'description'],
  ['deskripsi', 'description'],
  ['nama barang', 'description'],
  ['part name', 'description'],
  ['category', 'category'],
  ['category optional', 'category'],
  ['category (optional)', 'category'],
  ['kategori', 'category'],
  ['min qty', 'min_qty'],
  ['min. qty', 'min_qty'],
  ['min_qty', 'min_qty'],
  ['minimum stock', 'min_qty'],
]);

const CATEGORY_RULES = [
  { category: 'Mechanical/Fastener', confidence: 0.92, keywords: ['baut', 'bolt', 'screw', 'sekrup', 'mur', 'nut', 'ring', 'washer', 'rivet'] },
  { category: 'Mechanical/Bearing', confidence: 0.95, keywords: ['bearing', 'laher', 'bantalan'] },
  { category: 'Mechanical/Seal', confidence: 0.9, keywords: ['seal', 'gasket', 'o-ring', 'packing'] },
  { category: 'Mechanical/Pipe & Fitting', confidence: 0.88, keywords: ['pipa', 'pipe', 'selang', 'hose', 'fitting', 'valve', 'katup'] },
  { category: 'Mechanical/Belt & Chain', confidence: 0.86, keywords: ['belt', 'v-belt', 'chain', 'rantai', 'sprocket', 'gear'] },
  { category: 'Electrical/Cable', confidence: 0.9, keywords: ['kabel', 'cable', 'wire', 'kawat', 'nya', 'nym', 'nyyhy'] },
  { category: 'Electrical/Component', confidence: 0.88, keywords: ['relay', 'contactor', 'kontaktor', 'mcb', 'mccb', 'fuse', 'breaker', 'terminal', 'connector'] },
  { category: 'Electrical/Panel', confidence: 0.88, keywords: ['panel', 'hmi', 'plc', 'inverter', 'vfd'] },
  { category: 'Instrument/Pressure', confidence: 0.9, keywords: ['pressure', 'gauge', 'manometer'] },
  { category: 'Instrument/Flow', confidence: 0.9, keywords: ['flow', 'meter', 'thermometer', 'sensor'] },
  { category: 'Consumable/Lubricant', confidence: 0.9, keywords: ['oli', 'oil', 'grease', 'pelumas', 'lubricant'] },
  { category: 'Consumable/Chemical', confidence: 0.86, keywords: ['cat', 'paint', 'thinner', 'chemical', 'primer'] },
  { category: 'Safety', confidence: 0.84, keywords: ['safety', 'apd', 'ppe', 'helm', 'masker', 'glove', 'sarung tangan'] },
  { category: 'Tool', confidence: 0.84, keywords: ['kunci', 'obeng', 'tang', 'gerinda', 'bor', 'tool'] },
];

function generateTemplate() {
  const header = TEMPLATE_COLUMNS.join(',');
  const example = [
    '2026-08-09',
    'INV-2026-0001',
    'PO-2026-0001',
    '',
    '100',
    'pcs',
    'Baut M10 x 25mm Stainless',
    '',
    '10',
  ].join(',');

  const comments = [
    '# Template CSV Import SAP StockMon',
    '# Kolom wajib: Date, MR Invoice, Purchase Order, Quantity, Description',
    '# Serial Number boleh kosong, sistem akan auto-generate',
    '# Category boleh kosong, sistem akan auto-classify',
    '# Unit default: pcs, Min Qty default: 0',
    '# Format tanggal: YYYY-MM-DD',
    '# Unit valid: pcs, meter, kg, set, liter, box, roll, batang, lembar, unit, buah, pak, pasang',
    '#',
    '# Hapus baris komentar (#) sebelum import',
  ].join('\n');

  return `${comments}\n${header}\n${example}\n`;
}

function normalizeHeader(header) {
  const normalized = String(header || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return HEADER_ALIASES.get(normalized) || normalized.replace(/\s+/g, '_');
}

function classifyPart(description, explicitCategory) {
  const category = String(explicitCategory || '').trim();
  if (category) {
    return { category, categoryConfidence: 1, categoryAuto: false, needsReview: false };
  }

  const text = String(description || '').toLowerCase();
  const match = CATEGORY_RULES
    .map((rule) => {
      const hits = rule.keywords.filter((keyword) => text.includes(keyword));
      return { ...rule, score: hits.length ? rule.confidence + Math.min(hits.length - 1, 2) * 0.03 : 0 };
    })
    .filter((rule) => rule.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (!match) {
    return { category: 'Uncategorized', categoryConfidence: 0, categoryAuto: true, needsReview: true };
  }

  return {
    category: match.category,
    categoryConfidence: Math.min(match.score, 0.98),
    categoryAuto: true,
    needsReview: match.score < 0.7,
  };
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[xX]\s*\d+\b/g, '')
    .replace(/\b(pcs|unit|buah|set|kg|meter|m|cm|mm|liter|box|roll)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeExactHomogenRows(rows) {
  const merged = new Map();

  rows.forEach((row) => {
    const canMerge = !row.serialNumber;
    const key = [
      normalizeName(row.description),
      row.mrInvoice,
      row.purchaseOrder,
      row.unit,
      row.category,
    ].join('|');

    if (!canMerge || !merged.has(key)) {
      merged.set(canMerge ? key : `${key}|${row.serialNumber}|${merged.size}`, {
        ...row,
        sourceRows: row.sourceRows || 1,
      });
      return;
    }

    const target = merged.get(key);
    target.initialQty += row.initialQty;
    target.minQty = Math.max(target.minQty || 0, row.minQty || 0);
    target.sourceRows = (target.sourceRows || 1) + 1;
    target.importNote = `${target.sourceRows} baris homogen digabung`;
  });

  return [...merged.values()];
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filtered = content
    .split('\n')
    .filter((line) => !line.trim().startsWith('#') && line.trim() !== '')
    .join('\n');

  if (!filtered.trim()) {
    return { rows: [], errors: [], totalRows: 0 };
  }

  let records;
  try {
    records = parse(filtered, {
      columns: (headers) => headers.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    throw new Error(`Format CSV tidak valid: ${err.message}`);
  }

  const rows = [];
  const errors = [];

  records.forEach((record, idx) => {
    const rowNum = idx + 2;
    const rowErrors = [];

    for (const field of REQUIRED_FIELDS) {
      if (!record[field] || String(record[field]).trim() === '') {
        rowErrors.push(`Kolom '${field}' wajib diisi`);
      }
    }

    const qty = parseInt(record.initial_qty, 10);
    if (Number.isNaN(qty) || qty < 0) {
      rowErrors.push(`Quantity harus angka positif (dapat: '${record.initial_qty || ''}')`);
    }

    const minQty = parseInt(record.min_qty || '0', 10);
    if (Number.isNaN(minQty) || minQty < 0) {
      rowErrors.push(`Min Qty harus angka positif (dapat: '${record.min_qty || ''}')`);
    }

    if (record.date_entry && !/^\d{4}-\d{2}-\d{2}$/.test(record.date_entry.trim())) {
      rowErrors.push(`Date harus format YYYY-MM-DD (dapat: '${record.date_entry}')`);
    }

    const unit = (record.unit || 'pcs').toLowerCase().trim();
    const sn = (record.serial_number || '').trim();
    const isDupInBatch = sn && rows.some((row) => row.serialNumber === sn);
    if (isDupInBatch) {
      rowErrors.push(`Serial Number '${sn}' duplikat dalam file CSV`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, serialNumber: sn, errors: rowErrors });
      return;
    }

    const classification = classifyPart(record.description, record.category);
    rows.push({
      dateEntry: record.date_entry.trim(),
      mrInvoice: record.mr_invoice.trim(),
      purchaseOrder: record.purchase_order.trim(),
      serialNumber: sn,
      description: record.description.trim(),
      initialQty: qty,
      unit: VALID_UNITS.includes(unit) ? unit : 'pcs',
      minQty: Number.isNaN(minQty) ? 0 : minQty,
      category: classification.category,
      categoryConfidence: classification.categoryConfidence,
      categoryAuto: classification.categoryAuto,
      needsReview: classification.needsReview,
      snSource: sn ? 'csv' : 'auto',
    });
  });

  return { rows: mergeExactHomogenRows(rows), errors, totalRows: records.length };
}

function batchInsert(rows, onProgress) {
  const { getDb } = require('./db/db');
  const db = getDb();

  let inserted = 0;
  const duplicates = [];
  const failed = [];

  const importTx = db.transaction(() => {
    rows.forEach((row, idx) => {
      const res = partsRepo.createPart(row);
      if (res.success) {
        inserted++;
      } else if (res.error.code === 'DUPLICATE_SERIAL') {
        duplicates.push(row.serialNumber || row.description);
      } else {
        failed.push({ serialNumber: row.serialNumber, description: row.description, error: res.error.message });
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
