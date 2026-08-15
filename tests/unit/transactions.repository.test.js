/**
 * transactions.repository.test.js — Unit test for Transactions Repository
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('../helpers/test-db');
const partsRepo = require('../../src/main/db/parts.repository');
const txRepo = require('../../src/main/db/transactions.repository');

test('Transactions Repository: IN/OUT & Stock Integrity', async (t) => {
  const env = createTestDatabase();

  t.after(() => {
    env.cleanup();
  });

  let part = null;

  await t.test('setup: create test part with initial qty = 50', () => {
    const res = partsRepo.createPart({
      description: 'O-Ring NBR 70',
      category: 'Mechanical/Seal',
      initialQty: 50,
      minQty: 10,
      unit: 'pcs',
      mrInvoice: 'INV-2026-TX1',
      purchaseOrder: 'PO-2026-TX1',
    });
    assert.equal(res.success, true);
    part = res.data;
  });

  await t.test('createTransaction() OUT reduces stock accurately', () => {
    const tx = txRepo.createTransaction({
      partId: part.id,
      direction: 'OUT',
      quantity: 15,
      scanMethod: 'manual',
      operator: 'Operator-A',
    });

    assert.equal(tx.success, true);
    assert.equal(tx.data.direction, 'OUT');
    assert.equal(tx.data.quantity, 15);
    assert.equal(tx.data.qtyBefore, 50);
    assert.equal(tx.data.qtyAfter, 35);

    const updatedPart = partsRepo.getPartById(part.id).data;
    assert.equal(updatedPart.currentQty, 35);
  });

  await t.test('createTransaction() IN increases stock accurately', () => {
    const tx = txRepo.createTransaction({
      partId: part.id,
      direction: 'IN',
      quantity: 25,
      scanMethod: 'usb_hid',
      operator: 'Operator-B',
    });

    assert.equal(tx.success, true);
    assert.equal(tx.data.direction, 'IN');
    assert.equal(tx.data.quantity, 25);
    assert.equal(tx.data.qtyBefore, 35);
    assert.equal(tx.data.qtyAfter, 60);

    const updatedPart = partsRepo.getPartById(part.id).data;
    assert.equal(updatedPart.currentQty, 60);
  });

  await t.test('createTransaction() prevents negative stock / overdraft', () => {
    const tx = txRepo.createTransaction({
      partId: part.id,
      direction: 'OUT',
      quantity: 100, // Stock is 60, requested 100
    });

    assert.equal(tx.success, false);
    assert.equal(tx.error.code, 'STOCK_NEGATIVE');

    const unchangedPart = partsRepo.getPartById(part.id).data;
    assert.equal(unchangedPart.currentQty, 60);
  });

  await t.test('createTransaction() validates quantity and direction', () => {
    const invalidQty = txRepo.createTransaction({
      partId: part.id,
      direction: 'IN',
      quantity: -5,
    });
    assert.equal(invalidQty.success, false);
    assert.equal(invalidQty.error.code, 'INVALID_QTY');

    const invalidDir = txRepo.createTransaction({
      partId: part.id,
      direction: 'TRANSFER',
      quantity: 5,
    });
    assert.equal(invalidDir.success, false);
    assert.equal(invalidDir.error.code, 'INVALID_DIRECTION');
  });

  await t.test('getTransactions() lists transactions with direction and search filters', () => {
    const allTx = txRepo.getTransactions({});
    assert.equal(allTx.success, true);
    assert.equal(allTx.data.length, 2);

    const inTx = txRepo.getTransactions({ direction: 'IN' });
    assert.equal(inTx.success, true);
    assert.equal(inTx.data.length, 1);
    assert.equal(inTx.data[0].direction, 'IN');

    const searchTx = txRepo.getTransactions({ search: 'O-Ring' });
    assert.equal(searchTx.success, true);
    assert.equal(searchTx.data.length, 2);
  });

  await t.test('undoLastTransaction() rolls back latest transaction and stock', () => {
    // Current stock is 60 (after IN 25). Undoing it should revert to 35.
    const undoRes = txRepo.undoLastTransaction('Supervisor-Admin');
    assert.equal(undoRes.success, true);
    assert.equal(undoRes.data.restoredQty, 35);

    const partAfterUndo = partsRepo.getPartById(part.id).data;
    assert.equal(partAfterUndo.currentQty, 35);

    // Active transactions list should now show only 1 (the first OUT 15)
    const activeTx = txRepo.getTransactions({});
    assert.equal(activeTx.data.length, 1);
    assert.equal(activeTx.data[0].direction, 'OUT');
  });
});
