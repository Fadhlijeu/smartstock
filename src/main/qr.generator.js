/**
 * qr.generator.js — QR Code Generator untuk SAP StockMon
 * Menggunakan library `qrcode` (node-qrcode).
 * QR payload: JSON yang berisi identitas part.
 *
 * Format payload: {"qrId":"QR-2026-0001","sn":"BOLT-M10-001","desc":"Baut M10"}
 */

'use strict';

const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Buat QR payload JSON dari data part
 * @param {Object} part
 * @returns {string} JSON string untuk di-encode ke QR
 */
function buildPayload(part) {
  return JSON.stringify({
    qrId: part.qrId || part.qr_id,
    sn: part.serialNumber || part.serial_number,
    desc: (part.description || '').slice(0, 40), // Max 40 char biar QR tidak terlalu dense
  });
}

/**
 * Hitung MD5 hash dari payload (untuk deteksi stale QR)
 * @param {string} payload
 * @returns {string}
 */
function hashPayload(payload) {
  return crypto.createHash('md5').update(payload).digest('hex');
}

/**
 * Generate QR code sebagai data URL PNG (base64)
 * @param {string} payload - JSON string
 * @param {Object} options
 * @returns {Promise<string>} data:image/png;base64,...
 */
async function generateDataUrl(payload, options = {}) {
  const opts = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 1,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: options.size || 256,
    ...options,
  };

  return await QRCode.toDataURL(payload, opts);
}

/**
 * Generate QR code sebagai SVG string
 * @param {string} payload
 * @param {Object} options
 * @returns {Promise<string>} SVG string
 */
async function generateSVG(payload, options = {}) {
  const opts = {
    errorCorrectionLevel: 'M',
    type: 'svg',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: options.size || 256,
    ...options,
  };

  return await QRCode.toString(payload, opts);
}

/**
 * Generate QR untuk sebuah part dan return semua data yang diperlukan
 * @param {Object} part - Part object (camelCase dari repository)
 * @param {Object} options - { size: 256 }
 * @returns {Promise<{ dataUrl: string, svg: string, payload: string, hash: string }>}
 */
async function generateForPart(part, options = {}) {
  const payload = buildPayload(part);
  const hash = hashPayload(payload);
  const [dataUrl, svg] = await Promise.all([
    generateDataUrl(payload, options),
    generateSVG(payload, options),
  ]);

  return { dataUrl, svg, payload, hash };
}

module.exports = { buildPayload, hashPayload, generateDataUrl, generateSVG, generateForPart };
