/**
 * qr.generator.test.js — Unit test for QR Generator
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const qrGen = require('../../src/main/qr.generator');

test('QR Generator: Payload & Image Generation', async (t) => {
  const samplePart = {
    id: 'part-uuid-1234',
    qrId: 'QR-2026-0001',
    serialNumber: 'FAST-2026-0001',
    mrInvoice: 'INV-2026-001',
    purchaseOrder: 'PO-2026-001',
    currentQty: 150,
    category: 'Mechanical/Fastener',
    description: 'Baut M10 x 30mm SS304 Stainless Steel Extra Long Name That Might Exceed Forty Chars',
  };

  await t.test('buildPayload() generates valid v1 JSON payload', () => {
    const jsonStr = qrGen.buildPayload(samplePart);
    const parsed = JSON.parse(jsonStr);

    assert.equal(parsed.v, 1);
    assert.equal(parsed.id, 'QR-2026-0001');
    assert.equal(parsed.sn, 'FAST-2026-0001');
    assert.equal(parsed.mr, 'INV-2026-001');
    assert.equal(parsed.po, 'PO-2026-001');
    assert.equal(parsed.qty, 150);
    assert.equal(parsed.cat, 'Mechanical/Fastener');
    assert.ok(parsed.ts > 0);
    assert.ok(parsed.desc.length <= 40, 'Description should be truncated to max 40 chars');
  });

  await t.test('hashPayload() generates consistent MD5 hash', () => {
    const payload = JSON.stringify({ v: 1, id: 'QR-2026-0001' });
    const hash1 = qrGen.hashPayload(payload);
    const hash2 = qrGen.hashPayload(payload);

    assert.equal(hash1, hash2);
    assert.match(hash1, /^[a-f0-9]{32}$/);
  });

  await t.test('generateDataUrl() creates a valid base64 PNG data URL', async () => {
    const payload = '{"v":1,"id":"QR-2026-0001"}';
    const dataUrl = await qrGen.generateDataUrl(payload, { size: 200 });

    assert.ok(dataUrl.startsWith('data:image/png;base64,'));
  });

  await t.test('generateSVG() creates valid SVG XML string', async () => {
    const payload = '{"v":1,"id":"QR-2026-0001"}';
    const svg = await qrGen.generateSVG(payload);

    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('</svg>'));
  });

  await t.test('generateForPart() generates bundled QR package', async () => {
    const result = await qrGen.generateForPart(samplePart);

    assert.ok(result.dataUrl.startsWith('data:image/png;base64,'));
    assert.ok(result.svg.includes('<svg'));
    assert.ok(result.payload.includes('QR-2026-0001'));
    assert.match(result.hash, /^[a-f0-9]{32}$/);
  });
});
