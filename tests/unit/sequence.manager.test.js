/**
 * sequence.manager.test.js — Unit test for Sequence Manager
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('../helpers/test-db');
const seqManager = require('../../src/main/db/sequence.manager');
const partsRepo = require('../../src/main/db/parts.repository');

test('Sequence Manager: QR ID & Serial Number Sequences', async (t) => {
  const env = createTestDatabase();

  t.after(() => {
    env.cleanup();
  });

  const year = new Date().getFullYear();

  await t.test('peekNextQrId() peeks without advancing sequence', () => {
    const peek1 = seqManager.peekNextQrId(year);
    assert.equal(peek1, `QR-${year}-0001`);

    const peek2 = seqManager.peekNextQrId(year);
    assert.equal(peek2, `QR-${year}-0001`);
  });

  await t.test('nextQrId() advances counter atomically', () => {
    const id1 = seqManager.nextQrId(year);
    assert.equal(id1, `QR-${year}-0001`);

    const id2 = seqManager.nextQrId(year);
    assert.equal(id2, `QR-${year}-0002`);

    const peekAfter = seqManager.peekNextQrId(year);
    assert.equal(peekAfter, `QR-${year}-0003`);
  });

  await t.test('serialPrefixFor() determines correct prefix for categories & keywords', () => {
    assert.equal(seqManager.serialPrefixFor({ category: 'Mechanical/Fastener' }), 'FAST');
    assert.equal(seqManager.serialPrefixFor({ category: 'Mechanical/Bearing' }), 'BEAR');
    assert.equal(seqManager.serialPrefixFor({ category: 'Mechanical/Seal' }), 'SEAL');
    assert.equal(seqManager.serialPrefixFor({ category: 'Electrical/Cable' }), 'CABL');
    assert.equal(seqManager.serialPrefixFor({ category: 'Instrument/Pressure' }), 'PRES');
    assert.equal(seqManager.serialPrefixFor({ category: 'Tool' }), 'TOOL');
    assert.equal(seqManager.serialPrefixFor({ description: 'Baut M10' }), 'FAST');
    assert.equal(seqManager.serialPrefixFor({ description: 'Kabel Supreme' }), 'CABL');
    assert.equal(seqManager.serialPrefixFor({ description: 'Barang Umum Lain' }), 'ITEM');
  });

  await t.test('nextSerialNumber() generates incremental serials per category prefix', () => {
    const sn1 = seqManager.nextSerialNumber({ category: 'Mechanical/Fastener' }, year);
    assert.equal(sn1, `FAST-${year}-0001`);

    // Create a part in DB with that serial
    partsRepo.createPart({
      serialNumber: sn1,
      description: 'Baut M6',
      initialQty: 10,
      unit: 'pcs',
      mrInvoice: 'INV-SEQ1',
      purchaseOrder: 'PO-SEQ1',
    });

    const sn2 = seqManager.nextSerialNumber({ category: 'Mechanical/Fastener' }, year);
    assert.equal(sn2, `FAST-${year}-0002`);

    // Check bearing prefix is independent
    const bearSn = seqManager.nextSerialNumber({ category: 'Mechanical/Bearing' }, year);
    assert.equal(bearSn, `BEAR-${year}-0001`);
  });

  await t.test('isQrIdTaken() detects presence of QR ID in parts table', () => {
    const part = partsRepo.createPart({
      description: 'Test Check Part',
      initialQty: 5,
      unit: 'pcs',
      mrInvoice: 'INV-CHK',
      purchaseOrder: 'PO-CHK',
    });

    assert.equal(seqManager.isQrIdTaken(part.data.qrId), true);
    assert.equal(seqManager.isQrIdTaken('QR-9999-9999'), false);
  });
});
