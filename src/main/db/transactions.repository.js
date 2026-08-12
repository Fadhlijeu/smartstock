/**
 * transactions.repository.js - stock IN/OUT transaction repository.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

function now() {
  return new Date().toISOString();
}

function rowToTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    partId: row.part_id,
    qrId: row.qr_id,
    direction: row.direction,
    quantity: row.quantity,
    qtyBefore: row.qty_before,
    qtyAfter: row.qty_after,
    scanMethod: row.scan_method,
    operator: row.operator,
    note: row.note,
    isUndone: row.is_undone === 1,
    undoneAt: row.undone_at,
    undoneBy: row.undone_by,
    scannedAt: row.scanned_at,
    partDescription: row.part_description,
    serialNumber: row.serial_number,
    unit: row.unit,
  };
}

function getTransactions(filters = {}) {
  try {
    const db = getDb();
    const {
      direction,
      dateFrom,
      dateTo,
      search,
      limit = 200,
      offset = 0,
    } = filters;

    const conditions = ['t.is_undone = 0'];
    const params = [];

    if (direction === 'IN' || direction === 'OUT') {
      conditions.push('t.direction = ?');
      params.push(direction);
    }

    if (dateFrom) {
      conditions.push('date(t.scanned_at) >= date(?)');
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push('date(t.scanned_at) <= date(?)');
      params.push(dateTo);
    }

    if (search) {
      const term = `%${search}%`;
      conditions.push('(p.description LIKE ? OR p.serial_number LIKE ? OR t.qr_id LIKE ? OR p.mr_invoice LIKE ?)');
      params.push(term, term, term, term);
    }

    params.push(limit, offset);

    const rows = db.prepare(`
      SELECT
        t.*,
        p.description AS part_description,
        p.serial_number,
        p.unit
      FROM transactions t
      LEFT JOIN parts p ON p.id = t.part_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.scanned_at DESC
      LIMIT ? OFFSET ?
    `).all(...params);

    return { success: true, data: rows.map(rowToTransaction) };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

function createTransaction(data) {
  try {
    const db = getDb();
    const quantity = Number.parseInt(data.quantity, 10);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, error: { code: 'INVALID_QTY', message: 'Quantity transaksi harus lebih dari 0' } };
    }

    if (data.direction !== 'IN' && data.direction !== 'OUT') {
      return { success: false, error: { code: 'INVALID_DIRECTION', message: 'Direction harus IN atau OUT' } };
    }

    const tx = db.transaction(() => {
      const part = db.prepare('SELECT * FROM parts WHERE id = ? AND is_deleted = 0').get(data.partId);
      if (!part) {
        return { success: false, error: { code: 'PART_NOT_FOUND', message: `Part tidak ditemukan: ${data.partId}` } };
      }

      const qtyBefore = part.current_qty;
      const qtyAfter = data.direction === 'IN' ? qtyBefore + quantity : qtyBefore - quantity;

      if (qtyAfter < 0) {
        return { success: false, error: { code: 'STOCK_NEGATIVE', message: `Stok tidak cukup: sisa ${qtyBefore} ${part.unit}` } };
      }

      const timestamp = now();
      const id = uuidv4();
      db.prepare(`
        INSERT INTO transactions (
          id, part_id, qr_id, direction, quantity, qty_before, qty_after,
          scan_method, operator, note, scanned_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        part.id,
        part.qr_id,
        data.direction,
        quantity,
        qtyBefore,
        qtyAfter,
        data.scanMethod || 'manual',
        data.operator || null,
        data.note || null,
        timestamp,
      );

      db.prepare('UPDATE parts SET current_qty = ?, updated_at = ? WHERE id = ?')
        .run(qtyAfter, timestamp, part.id);

      const row = db.prepare(`
        SELECT
          t.*,
          p.description AS part_description,
          p.serial_number,
          p.unit
        FROM transactions t
        LEFT JOIN parts p ON p.id = t.part_id
        WHERE t.id = ?
      `).get(id);

      return { success: true, data: rowToTransaction(row) };
    });

    return tx();
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

function undoLastTransaction(operator = null) {
  try {
    const db = getDb();
    const tx = db.transaction(() => {
      const row = db.prepare(`
        SELECT * FROM transactions
        WHERE is_undone = 0
        ORDER BY scanned_at DESC
        LIMIT 1
      `).get();

      if (!row) {
        return { success: false, error: { code: 'NO_TRANSACTION', message: 'Belum ada transaksi untuk di-undo' } };
      }

      const part = db.prepare('SELECT * FROM parts WHERE id = ? AND is_deleted = 0').get(row.part_id);
      if (!part) {
        return { success: false, error: { code: 'PART_NOT_FOUND', message: 'Part transaksi tidak ditemukan' } };
      }

      const restoredQty = row.qty_before;
      const timestamp = now();

      db.prepare('UPDATE parts SET current_qty = ?, updated_at = ? WHERE id = ?')
        .run(restoredQty, timestamp, row.part_id);
      db.prepare('UPDATE transactions SET is_undone = 1, undone_at = ?, undone_by = ? WHERE id = ?')
        .run(timestamp, operator, row.id);

      return { success: true, data: { id: row.id, restoredQty, partId: row.part_id } };
    });

    return tx();
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

module.exports = { getTransactions, createTransaction, undoLastTransaction };
