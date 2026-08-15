/**
 * settings.repository.test.js — Unit test for Settings Repository
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase } = require('../helpers/test-db');
const settingsRepo = require('../../src/main/db/settings.repository');

test('Settings Repository: Key-Value Config & Persistence', async (t) => {
  const env = createTestDatabase();

  t.after(() => {
    env.cleanup();
  });

  await t.test('getAllSettings() returns default configuration values', () => {
    const res = settingsRepo.getAllSettings();
    assert.equal(res.success, true);
    assert.equal(res.data['app.theme'], 'dark');
    assert.equal(res.data['scanner.beep'], true);
  });

  await t.test('getSetting() returns a single typed setting value', () => {
    const theme = settingsRepo.getSetting('app.theme');
    assert.equal(theme.success, true);
    assert.equal(theme.data, 'dark');

    const beep = settingsRepo.getSetting('scanner.beep');
    assert.equal(beep.success, true);
    assert.equal(beep.data, true);
  });

  await t.test('updateSettings() updates and persists multiple settings', () => {
    const updateRes = settingsRepo.updateSettings({
      'app.theme': 'light',
      'scanner.beep': false,
      'stock.min_qty_default': 15,
    });

    assert.equal(updateRes.success, true);

    const themeAfter = settingsRepo.getSetting('app.theme').data;
    assert.equal(themeAfter, 'light');

    const beepAfter = settingsRepo.getSetting('scanner.beep').data;
    assert.equal(beepAfter, false);

    const minQtyAfter = settingsRepo.getSetting('stock.min_qty_default').data;
    assert.equal(minQtyAfter, 15);
  });
});
