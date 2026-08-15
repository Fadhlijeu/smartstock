/**
 * parts.repository.test.js — Unit test for Parts Repository
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('../helpers/test-db');
const partsRepo = require('../../src/main/db/parts.repository');

test('Parts Repository: CRUD & Queries', async (t) => {
  const env = createTestDatabase();

  t.after(() => {
    env.cleanup();
  });

  let createdPart = null;

  await t.test('createPart() creates a new part with auto-generated serial & QR sequence', () => {
    const res = partsRepo.createPart({
      description: 'Baut Hex Head M8 x 20mm SS304',
      category: 'Mechanical/Fastener',
      initialQty: 100,
      minQty: 20,
      unit: 'pcs',
      mrInvoice: 'INV-2026-001',
      purchaseOrder: 'PO-2026-001',
      dateEntry: '2026-08-15',
    });

    assert.equal(res.success, true);
    assert.ok(res.data.id);
    assert.match(res.data.qrId, /^QR-\d{4}-\d{4}$/);
    assert.match(res.data.serialNumber, /^FAST-\d{4}-\d{4}$/);
    assert.equal(res.data.description, 'Baut Hex Head M8 x 20mm SS304');
    assert.equal(res.data.currentQty, 100);
    assert.equal(res.data.status, 'OK');

    createdPart = res.data;
  });

  await t.test('createPart() fails on duplicate serial number', () => {
    const res = partsRepo.createPart({
      serialNumber: createdPart.serialNumber,
      description: 'Duplikat Part',
      initialQty: 10,
      unit: 'pcs',
      mrInvoice: 'INV-2026-002',
      purchaseOrder: 'PO-2026-002',
    });

    assert.equal(res.success, false);
    assert.equal(res.error.code, 'DUPLICATE_SERIAL');
  });

  await t.test('getPartById() retrieves the created part', () => {
    const res = partsRepo.getPartById(createdPart.id);
    assert.equal(res.success, true);
    assert.equal(res.data.id, createdPart.id);
    assert.equal(res.data.description, createdPart.description);
  });

  await t.test('getPartByQrId() retrieves by QR ID', () => {
    const res = partsRepo.getPartByQrId(createdPart.qrId);
    assert.equal(res.success, true);
    assert.equal(res.data.id, createdPart.id);
  });

  await t.test('getPartBySerialNumber() retrieves by Serial Number', () => {
    const res = partsRepo.getPartBySerialNumber(createdPart.serialNumber);
    assert.equal(res.success, true);
    assert.equal(res.data.id, createdPart.id);
  });

  await t.test('updatePart() modifies fields and updates computed status', () => {
    // Update stock to low stock
    const updateRes = partsRepo.updatePart(createdPart.id, {
      currentQty: 10, // minQty is 20, so 10 <= 20 => LOW
      description: 'Baut Hex Head M8 x 20mm SS304 (Updated)',
    });

    assert.equal(updateRes.success, true);
    assert.equal(updateRes.data.currentQty, 10);
    assert.equal(updateRes.data.status, 'LOW');
    assert.equal(updateRes.data.description, 'Baut Hex Head M8 x 20mm SS304 (Updated)');

    // Update stock to 0 => OUT
    const outRes = partsRepo.updatePart(createdPart.id, { currentQty: 0 });
    assert.equal(outRes.success, true);
    assert.equal(outRes.data.status, 'OUT');
  });

  await t.test('getParts() filters by search keyword and category', () => {
    // Create another part
    partsRepo.createPart({
      description: 'Bearing 6205 SKF',
      category: 'Mechanical/Bearing',
      initialQty: 50,
      minQty: 5,
      unit: 'pcs',
      mrInvoice: 'INV-2026-003',
      purchaseOrder: 'PO-2026-003',
    });

    const searchRes = partsRepo.getParts({ search: 'Bearing' });
    assert.equal(searchRes.success, true);
    assert.equal(searchRes.data.length, 1);
    assert.equal(searchRes.data[0].category, 'Mechanical/Bearing');

    const catRes = partsRepo.getParts({ category: 'Mechanical/Fastener' });
    assert.equal(catRes.success, true);
    assert.equal(catRes.data.length, 1);
  });

  await t.test('getKpiStats() aggregates accurate inventory counts', () => {
    const kpiRes = partsRepo.getKpiStats();
    assert.equal(kpiRes.success, true);
    assert.equal(kpiRes.data.totalSku, 2);
    assert.equal(kpiRes.data.outCount, 1); // createdPart is 0 qty
  });

  await t.test('deletePart() performs soft delete', () => {
    const delRes = partsRepo.deletePart(createdPart.id);
    assert.equal(delRes.success, true);

    const getRes = partsRepo.getPartById(createdPart.id);
    assert.equal(getRes.success, false);
    assert.equal(getRes.error.code, 'NOT_FOUND');
  });

  await t.test('deletePartsBatch() deletes multiple items in one transaction', () => {
    // Create 3 parts
    const p1 = partsRepo.createPart({ description: 'Batch Item 1', initialQty: 10, mrInvoice: 'INV-B1', purchaseOrder: 'PO-B1' }).data;
    const p2 = partsRepo.createPart({ description: 'Batch Item 2', initialQty: 20, mrInvoice: 'INV-B2', purchaseOrder: 'PO-B2' }).data;
    const p3 = partsRepo.createPart({ description: 'Batch Item 3', initialQty: 30, mrInvoice: 'INV-B3', purchaseOrder: 'PO-B3' }).data;

    const batchRes = partsRepo.deletePartsBatch([p1.id, p2.id, p3.id]);
    assert.equal(batchRes.success, true);
    assert.equal(batchRes.data.deletedCount, 3);

    // Verify all 3 are soft deleted
    assert.equal(partsRepo.getPartById(p1.id).success, false);
    assert.equal(partsRepo.getPartById(p2.id).success, false);
    assert.equal(partsRepo.getPartById(p3.id).success, false);
  });

  await t.test('seedDemoData() creates multiple categorized items', () => {
    const seedRes = partsRepo.seedDemoData();
    assert.equal(seedRes.success, true);
    assert.ok(seedRes.data.createdCount >= 8);

    const all = partsRepo.getParts();
    assert.ok(all.data.length >= 8);
  });
});
