/**
 * e2e-workflow.test.js — End-to-End warehouse inventory lifecycle simulation
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
const csvService = require('../../src/main/csv.service');
const qrGen = require('../../src/main/qr.generator');
const exportService = require('../../src/main/export.service');
const settingsRepo = require('../../src/main/db/settings.repository');

test('E2E Warehouse Lifecycle: Add, Import, Scan, Audit & Export', async (t) => {
  const env = createTestDatabase();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-test-'));

  t.after(() => {
    env.cleanup();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  let createdItem = null;

  await t.test('Phase 1: Add new inventory item with auto QR code', async () => {
    const res = partsRepo.createPart({
      description: 'Sensor Ultrasonik Pepperl+Fuchs UB500',
      category: 'Electrical/Component',
      initialQty: 10,
      minQty: 3,
      unit: 'unit',
      mrInvoice: 'INV-E2E-001',
      purchaseOrder: 'PO-E2E-001',
    });

    assert.equal(res.success, true);
    createdItem = res.data;
    assert.equal(createdItem.currentQty, 10);
    assert.equal(createdItem.status, 'OK');

    // Generate QR payload
    const qr = await qrGen.generateForPart(createdItem);
    assert.ok(qr.dataUrl.startsWith('data:image/png;base64,'));
    assert.ok(qr.payload.includes(createdItem.qrId));
  });

  await t.test('Phase 2: Import batch CSV and verify auto-classification', () => {
    const csvContent = [
      'Date,MR Invoice,Purchase Order,Serial Number,Quantity,Unit,Description,Min Qty',
      '2026-08-15,INV-CSV-01,PO-CSV-01,,40,pcs,Bearing 6204 SKF,10',
      '2026-08-15,INV-CSV-01,PO-CSV-01,,80,meter,Kabel NYYHY 3x1.5mm,20',
      '2026-08-15,INV-CSV-02,PO-CSV-02,,15,liter,Oli Pelumas Shell Tellus 68,5',
    ].join('\n');

    const csvPath = path.join(tmpDir, 'batch_import.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    const parseResult = csvService.parseCSV(csvPath);
    assert.equal(parseResult.errors.length, 0);
    assert.equal(parseResult.rows.length, 3);

    const insertResult = csvService.batchInsert(parseResult.rows);
    assert.equal(insertResult.inserted, 3);

    const stats = partsRepo.getKpiStats().data;
    assert.equal(stats.totalSku, 4); // 1 manual + 3 imported
  });

  await t.test('Phase 3: Simulate warehouse scan OUT operations until LOW stock alert', () => {
    // Scan OUT 8 units of the Sensor (initial 10, now 2 remaining -> LOW stock threshold 3)
    const scanOutTx = txRepo.createTransaction({
      partId: createdItem.id,
      direction: 'OUT',
      quantity: 8,
      scanMethod: 'barcode_scanner',
      operator: 'Gudang-A',
      note: 'Pengambilan untuk Mesin Line 2',
    });

    assert.equal(scanOutTx.success, true);
    assert.equal(scanOutTx.data.qtyBefore, 10);
    assert.equal(scanOutTx.data.qtyAfter, 2);

    const updated = partsRepo.getPartById(createdItem.id).data;
    assert.equal(updated.currentQty, 2);
    assert.equal(updated.status, 'LOW');

    const kpi = partsRepo.getKpiStats().data;
    assert.equal(kpi.lowCount, 1);
  });

  await t.test('Phase 4: Scan OUT remaining stock until OUT of stock (0 qty)', () => {
    const scanOutFinal = txRepo.createTransaction({
      partId: createdItem.id,
      direction: 'OUT',
      quantity: 2,
      scanMethod: 'barcode_scanner',
      operator: 'Gudang-A',
    });

    assert.equal(scanOutFinal.success, true);
    assert.equal(scanOutFinal.data.qtyAfter, 0);

    const updated = partsRepo.getPartById(createdItem.id).data;
    assert.equal(updated.currentQty, 0);
    assert.equal(updated.status, 'OUT');

    const kpi = partsRepo.getKpiStats().data;
    assert.equal(kpi.outCount, 1);
  });

  await t.test('Phase 5: Restock item via scan IN', () => {
    const scanInTx = txRepo.createTransaction({
      partId: createdItem.id,
      direction: 'IN',
      quantity: 20,
      scanMethod: 'barcode_scanner',
      operator: 'Gudang-Receiving',
    });

    assert.equal(scanInTx.success, true);
    assert.equal(scanInTx.data.qtyAfter, 20);

    const updated = partsRepo.getPartById(createdItem.id).data;
    assert.equal(updated.currentQty, 20);
    assert.equal(updated.status, 'OK');
  });

  await t.test('Phase 6: Export all audit logs and stock to Excel', async () => {
    const stockExcel = path.join(tmpDir, 'e2e_stock.xlsx');
    const txExcel = path.join(tmpDir, 'e2e_transactions.xlsx');

    const res1 = await exportService.exportStockSnapshot(stockExcel);
    assert.equal(res1.success, true);
    assert.ok(fs.existsSync(stockExcel));

    const res2 = await exportService.exportTransactionLog(txExcel);
    assert.equal(res2.success, true);
    assert.ok(fs.existsSync(txExcel));
  });

  await t.test('Phase 7: Settings persistence', () => {
    settingsRepo.updateSettings({
      'app.theme': 'light',
      'scanner.beep_volume': 0.9,
    });

    const current = settingsRepo.getAllSettings().data;
    assert.equal(current['app.theme'], 'light');
    assert.equal(current['scanner.beep_volume'], 0.9);
  });
});
