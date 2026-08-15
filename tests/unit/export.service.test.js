/**
 * export.service.test.js — Unit test for Excel Export Service
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createTestDatabase } = require('../helpers/test-db');
const partsRepo = require('../../src/main/db/parts.repository');
const txRepo = require('../../src/main/db/transactions.repository');
const exportService = require('../../src/main/export.service');

test('Export Service: Excel (.xlsx) Workbooks', async (t) => {
  const env = createTestDatabase();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-test-'));

  t.after(() => {
    env.cleanup();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('setup: seed parts and transactions', () => {
    const p1 = partsRepo.createPart({
      description: 'Mur Hex M10 SS304',
      category: 'Mechanical/Fastener',
      initialQty: 100,
      minQty: 20,
      unit: 'pcs',
      mrInvoice: 'INV-EXP-1',
      purchaseOrder: 'PO-EXP-1',
    });

    const p2 = partsRepo.createPart({
      description: 'Grease Mobilith SHC 220',
      category: 'Consumable/Lubricant',
      initialQty: 5,
      minQty: 10, // 5 <= 10 => LOW
      unit: 'kg',
      mrInvoice: 'INV-EXP-2',
      purchaseOrder: 'PO-EXP-2',
    });

    txRepo.createTransaction({
      partId: p1.data.id,
      direction: 'OUT',
      quantity: 10,
      scanMethod: 'manual',
    });
  });

  await t.test('exportStockSnapshot() generates valid Excel file', async () => {
    const filePath = path.join(tmpDir, 'stock_snapshot.xlsx');
    const res = await exportService.exportStockSnapshot(filePath);

    assert.equal(res.success, true);
    assert.ok(fs.existsSync(filePath));
    assert.ok(fs.statSync(filePath).size > 1000, 'Excel file should not be empty');
  });

  await t.test('exportLowStock() generates valid low stock report', async () => {
    const filePath = path.join(tmpDir, 'low_stock.xlsx');
    const res = await exportService.exportLowStock(filePath);

    assert.equal(res.success, true);
    assert.ok(fs.existsSync(filePath));
    assert.ok(fs.statSync(filePath).size > 1000);
  });

  await t.test('exportTransactionLog() generates valid transaction log', async () => {
    const filePath = path.join(tmpDir, 'transaction_log.xlsx');
    const res = await exportService.exportTransactionLog(filePath);

    assert.equal(res.success, true);
    assert.ok(fs.existsSync(filePath));
    assert.ok(fs.statSync(filePath).size > 1000);
  });
});
