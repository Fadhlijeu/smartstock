/**
 * ui-logic-and-components.test.js — Automated unit testing for UI logic, state, and form components
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('UI Logic & State Management', async (t) => {
  // Test State Manager
  await t.test('state.js pub/sub state management', async () => {
    const { state } = await import('../../src/renderer/js/state.js');

    let notifiedVal = null;
    const unsub = state.subscribe('scanDirection', (val) => {
      notifiedVal = val;
    });

    state.update('scanDirection', 'OUT');
    assert.equal(state.get('scanDirection'), 'OUT');
    assert.equal(notifiedVal, 'OUT');

    state.update('scanDirection', 'IN');
    assert.equal(state.get('scanDirection'), 'IN');
    assert.equal(notifiedVal, 'IN');

    unsub();
    state.update('scanDirection', 'OUT');
    // notifiedVal should remain 'IN' since unsubscribed
    assert.equal(notifiedVal, 'IN');
  });

  // Test Router route mapping
  await t.test('router.js route validation', async () => {
    const { ROUTES } = await import('../../src/renderer/js/router.js');

    assert.ok(ROUTES['#dashboard'], 'Dashboard route must be defined');
    assert.ok(ROUTES['#scanner'], 'Scanner route must be defined');
    assert.ok(ROUTES['#parts'], 'Parts route must be defined');
    assert.ok(ROUTES['#history'], 'History route must be defined');
    assert.ok(ROUTES['#reports'], 'Reports route must be defined');
    assert.ok(ROUTES['#settings'], 'Settings route must be defined');
  });

  // Test Part Form HTML rendering and validation
  await t.test('part-form.js form rendering and validation', async () => {
    const { renderPartForm, validatePartForm } = await import('../../src/renderer/js/components/part-form.js');

    const html = renderPartForm();
    assert.ok(html.includes('id="part-form"'));
    assert.ok(html.includes('name="dateEntry"'));
    assert.ok(html.includes('name="mrInvoice"'));
    assert.ok(html.includes('name="description"'));
    assert.ok(html.includes('name="initialQty"'));

    // Test with prefilled part
    const editHtml = renderPartForm({
      id: 'p1',
      description: 'Baut M10',
      currentQty: 25,
      unit: 'pcs',
      status: 'OK',
    });
    assert.ok(editHtml.includes('value="Baut M10"'));
    assert.ok(editHtml.includes('name="currentQty"'));

    // Test form validation logic with mock DOM form
    const mockForm = {
      querySelectorAll: () => [],
      querySelector: (selector) => {
        const values = {
          '[name="dateEntry"]': { value: '2026-08-15' },
          '[name="mrInvoice"]': { value: 'INV-2026-001' },
          '[name="purchaseOrder"]': { value: 'PO-2026-001' },
          '[name="description"]': { value: 'Baut M10 SS304' },
          '[name="category"]': { value: 'Mechanical/Fastener' },
          '[name="unit"]': { value: 'pcs' },
          '[name="minQty"]': { value: '10' },
          '[name="initialQty"]': { value: '100' },
          '[name="serialNumber"]': { value: '' },
        };
        return values[selector] || null;
      },
    };

    const validated = validatePartForm(mockForm, false);
    assert.ok(validated);
    assert.equal(validated.description, 'Baut M10 SS304');
    assert.equal(validated.initialQty, 100);
    assert.equal(validated.category, 'Mechanical/Fastener');
  });
});
