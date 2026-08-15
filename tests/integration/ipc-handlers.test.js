/**
 * ipc-handlers.test.js — Integration test for IPC Handler Registry
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('../helpers/test-db');
const { registerIpcHandlers } = require('../../src/main/ipc-handlers');
const electron = require('electron');

test('IPC Handlers: Channel Registry & Execution', async (t) => {
  const env = createTestDatabase();

  t.after(() => {
    env.cleanup();
  });

  // Create IPC mock dispatcher
  const handlers = new Map();
  const mockIpcMain = {
    handle: (channel, fn) => {
      handlers.set(channel, fn);
    },
  };

  // Replace ipcMain.handle temporarily
  const originalHandle = electron.ipcMain ? electron.ipcMain.handle : null;
  if (electron.ipcMain) {
    electron.ipcMain.handle = mockIpcMain.handle;
  }

  const dummyLogger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} };
  registerIpcHandlers(dummyLogger, mockIpcMain);

  const invoke = async (channel, ...args) => {
    const fn = handlers.get(channel);
    if (!fn) throw new Error(`Channel "${channel}" not registered`);
    const mockEvent = { sender: { send: () => {} } };
    return await fn(mockEvent, ...args);
  };

  let part = null;

  await t.test('parts:create and parts:getAll handlers', async () => {
    const createRes = await invoke('parts:create', {
      description: 'Valve Check 1 Inch Brass',
      category: 'Mechanical/Pipe & Fitting',
      initialQty: 25,
      minQty: 5,
      unit: 'pcs',
      mrInvoice: 'INV-IPC-01',
      purchaseOrder: 'PO-IPC-01',
    });

    assert.equal(createRes.success, true);
    part = createRes.data;

    const getAllRes = await invoke('parts:getAll', {});
    assert.equal(getAllRes.success, true);
    assert.equal(getAllRes.data.length, 1);
  });

  await t.test('parts:getById, parts:getByQrId, parts:getBySerialNumber', async () => {
    const byId = await invoke('parts:getById', part.id);
    assert.equal(byId.success, true);
    assert.equal(byId.data.id, part.id);

    const byQr = await invoke('parts:getByQrId', part.qrId);
    assert.equal(byQr.success, true);
    assert.equal(byQr.data.id, part.id);

    const bySn = await invoke('parts:getBySerialNumber', part.serialNumber);
    assert.equal(bySn.success, true);
    assert.equal(bySn.data.id, part.id);
  });

  await t.test('transactions:create and stock update event', async () => {
    const txRes = await invoke('transactions:create', {
      partId: part.id,
      direction: 'OUT',
      quantity: 5,
      scanMethod: 'manual',
    });

    assert.equal(txRes.success, true);
    assert.equal(txRes.data.qtyAfter, 20);

    const kpiRes = await invoke('parts:kpiStats');
    assert.equal(kpiRes.success, true);
    assert.equal(kpiRes.data.totalSku, 1);
  });

  await t.test('qr:generateForPart, qr:getDataUrl, qr:peekNext', async () => {
    const qrRes = await invoke('qr:generateForPart', part.id);
    assert.equal(qrRes.success, true);
    assert.ok(qrRes.data.dataUrl.startsWith('data:image/png;base64,'));

    const peekRes = await invoke('qr:peekNext');
    assert.equal(peekRes.success, true);
    assert.match(peekRes.data.nextId, /^QR-\d{4}-\d{4}$/);
  });

  await t.test('settings:getAll, settings:get, settings:update', async () => {
    const updateRes = await invoke('settings:update', { 'app.theme': 'light' });
    assert.equal(updateRes.success, true);

    const getRes = await invoke('settings:get', 'app.theme');
    assert.equal(getRes.success, true);
    assert.equal(getRes.data, 'light');
  });

  await t.test('data:seedDemo populates warehouse catalog', async () => {
    const seedRes = await invoke('data:seedDemo');
    assert.equal(seedRes.success, true);
    assert.ok(seedRes.data.createdCount >= 8);
  });

  await t.test('parts:deleteBatch removes multiple items via IPC', async () => {
    const p1 = (await invoke('parts:create', { description: 'IPC Multi 1', initialQty: 5, mrInvoice: 'INV-M1', purchaseOrder: 'PO-M1' })).data;
    const p2 = (await invoke('parts:create', { description: 'IPC Multi 2', initialQty: 5, mrInvoice: 'INV-M2', purchaseOrder: 'PO-M2' })).data;

    const delBatchRes = await invoke('parts:deleteBatch', [p1.id, p2.id]);
    assert.equal(delBatchRes.success, true);
    assert.equal(delBatchRes.data.deletedCount, 2);

    const checkP1 = await invoke('parts:getById', p1.id);
    assert.equal(checkP1.success, false);
  });

  t.after(() => {
    if (originalHandle && electron.ipcMain) {
      electron.ipcMain.handle = originalHandle;
    }
  });
});
