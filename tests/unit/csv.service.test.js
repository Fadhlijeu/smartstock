/**
 * csv.service.test.js — Unit test for CSV Service & Classification Engine
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createTestDatabase } = require('../helpers/test-db');
const csvService = require('../../src/main/csv.service');

test('CSV Service: Parser, Validation, Auto-Classify & Batch Insert', async (t) => {
  const env = createTestDatabase();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-test-'));

  t.after(() => {
    env.cleanup();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('generateTemplate() produces CSV format with required headers', () => {
    const template = csvService.generateTemplate();
    assert.ok(template.includes('Date,MR Invoice,Purchase Order,Serial Number,Quantity,Unit,Description,Category (optional),Min Qty'));
    assert.ok(template.includes('INV-2026-0001'));
  });

  await t.test('parseCSV() parses standard CSV and normalizes header aliases', () => {
    const csvContent = [
      'Tanggal,Invoice,PO,Serial,Jumlah,Satuan,Deskripsi,Min Qty',
      '2026-08-15,INV-CSV-01,PO-CSV-01,,50,pcs,Baut M8x30 Hex,10',
      '2026-08-15,INV-CSV-01,PO-CSV-01,,20,pcs,Bearing 608zz SKF,5',
      '2026-08-15,INV-CSV-02,PO-CSV-02,CABL-SPEC-01,100,meter,Kabel NYM 2x1.5mm,20',
    ].join('\n');

    const csvFile = path.join(tmpDir, 'valid.csv');
    fs.writeFileSync(csvFile, csvContent, 'utf-8');

    const parsed = csvService.parseCSV(csvFile);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rows.length, 3);

    // Auto-classification assertions
    assert.equal(parsed.rows[0].category, 'Mechanical/Fastener');
    assert.equal(parsed.rows[1].category, 'Mechanical/Bearing');
    assert.equal(parsed.rows[2].category, 'Electrical/Cable');
  });

  await t.test('parseCSV() detects and reports validation errors', () => {
    const badCsvContent = [
      'Date,MR Invoice,Purchase Order,Serial Number,Quantity,Unit,Description,Min Qty',
      ',INV-BAD,PO-BAD,,50,pcs,Deskripsi Tanpa Tanggal,5',             // Missing date
      '2026-08-15,,PO-BAD,,50,pcs,Deskripsi Tanpa Invoice,5',          // Missing invoice
      '2026-08-15,INV-BAD,PO-BAD,,-10,pcs,Baut Negatif,5',             // Negative qty
      'bukan-tanggal,INV-BAD,PO-BAD,,10,pcs,Format Tanggal Salah,5',   // Invalid date format
      '2026-08-15,INV-BAD,PO-BAD,DUP-01,10,pcs,Barang Satu,5',
      '2026-08-15,INV-BAD,PO-BAD,DUP-01,10,pcs,Barang Duplikat SN,5',  // Duplicate SN in file
    ].join('\n');

    const badFile = path.join(tmpDir, 'bad.csv');
    fs.writeFileSync(badFile, badCsvContent, 'utf-8');

    const parsed = csvService.parseCSV(badFile);
    assert.ok(parsed.errors.length >= 5);
  });

  await t.test('parseCSV() merges exact homogen rows without serial number', () => {
    const homogenCsvContent = [
      'Date,MR Invoice,Purchase Order,Quantity,Unit,Description,Min Qty',
      '2026-08-15,INV-MERGE,PO-MERGE,30,pcs,Baut M10x25mm SS,5',
      '2026-08-15,INV-MERGE,PO-MERGE,70,pcs,Baut M10x25mm SS,5',
    ].join('\n');

    const homogenFile = path.join(tmpDir, 'homogen.csv');
    fs.writeFileSync(homogenFile, homogenCsvContent, 'utf-8');

    const parsed = csvService.parseCSV(homogenFile);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].initialQty, 100);
    assert.ok(parsed.rows[0].importNote.includes('homogen'));
  });

  await t.test('batchInsert() inserts parsed rows and tracks progress', () => {
    const rows = [
      {
        dateEntry: '2026-08-15',
        mrInvoice: 'INV-BATCH-01',
        purchaseOrder: 'PO-BATCH-01',
        description: 'Pipa Seamless 2 Inch Sch 40',
        initialQty: 12,
        unit: 'batang',
        minQty: 2,
        category: 'Mechanical/Pipe & Fitting',
      },
      {
        dateEntry: '2026-08-15',
        mrInvoice: 'INV-BATCH-02',
        purchaseOrder: 'PO-BATCH-02',
        description: 'Valve Ball 2 Inch Brass',
        initialQty: 8,
        unit: 'pcs',
        minQty: 2,
        category: 'Mechanical/Pipe & Fitting',
      }
    ];

    let progressReported = false;
    const result = csvService.batchInsert(rows, () => {
      progressReported = true;
    });

    assert.equal(result.inserted, 2);
    assert.equal(result.duplicates.length, 0);
    assert.equal(result.failed.length, 0);
    assert.equal(progressReported, true);
  });
});
