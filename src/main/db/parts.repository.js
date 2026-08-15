/**
 * parts.repository.js — CRUD untuk tabel `parts`
 * Semua operasi DB via prepared statements.
 * Return format: { success: true, data } | { success: false, error: { code, message } }
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');
const { nextQrId, nextSerialNumber } = require('./sequence.manager');

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Convert snake_case DB row ke camelCase JS object
 * @param {Object} row
 * @returns {Object}
 */
function rowToPart(row) {
  if (!row) return null;
  return {
    id: row.id,
    qrId: row.qr_id,
    dateEntry: row.date_entry,
    mrInvoice: row.mr_invoice,
    purchaseOrder: row.purchase_order,
    serialNumber: row.serial_number,
    initialQty: row.initial_qty,
    currentQty: row.current_qty,
    unit: row.unit,
    description: row.description,
    category: row.category,
    categoryConfidence: row.category_confidence,
    categoryAuto: row.category_auto === 1,
    needsReview: row.needs_review === 1,
    qrGeneratedAt: row.qr_generated_at,
    qrPayloadHash: row.qr_payload_hash,
    imagePath: row.image_path,
    snSource: row.sn_source,
    minQty: row.min_qty,
    isDeleted: row.is_deleted === 1,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Computed status
    status: getStockStatus(row),
  };
}

function getStockStatus(row) {
  if (row.current_qty <= 0) return 'OUT';
  if (row.min_qty > 0 && row.current_qty <= row.min_qty) return 'LOW';
  return 'OK';
}

function now() {
  return new Date().toISOString();
}

function normalizeCreateData(data) {
  const normalized = { ...data };
  const serialNumber = String(normalized.serialNumber || '').trim();

  if (!serialNumber) {
    normalized.serialNumber = nextSerialNumber(normalized);
    normalized.snSource = 'auto';
  } else {
    normalized.serialNumber = serialNumber;
  }

  return normalized;
}

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Buat part baru
 * @param {Object} data
 * @returns {{ success: boolean, data?: Object, error?: Object }}
 */
function createPart(data) {
  try {
    const db = getDb();
    const id = uuidv4();
    const timestamp = now();
    const partData = normalizeCreateData(data);

    const stmt = db.prepare(`
      INSERT INTO parts (
        id, qr_id, date_entry, mr_invoice, purchase_order,
        serial_number, initial_qty, current_qty, unit, description,
        category, category_confidence, category_auto, needs_review,
        sn_source, min_qty, created_at, updated_at
      ) VALUES (
        @id, @qrId, @dateEntry, @mrInvoice, @purchaseOrder,
        @serialNumber, @initialQty, @currentQty, @unit, @description,
        @category, @categoryConfidence, @categoryAuto, @needsReview,
        @snSource, @minQty, @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id,
      // Gunakan sequence manager untuk QR ID resmi (QR-YYYY-NNNN)
      // data.qrId hanya digunakan jika caller menyediakan override eksplisit
      qrId: partData.qrId || nextQrId(),
      dateEntry: partData.dateEntry || timestamp.slice(0, 10),
      mrInvoice: partData.mrInvoice,
      purchaseOrder: partData.purchaseOrder,
      serialNumber: partData.serialNumber,
      initialQty: partData.initialQty,
      currentQty: partData.initialQty, // Dimulai sama dengan initialQty
      unit: partData.unit || 'pcs',
      description: partData.description,
      category: partData.category || 'Uncategorized',
      categoryConfidence: partData.categoryConfidence || 0,
      categoryAuto: partData.categoryAuto !== false ? 1 : 0,
      needsReview: partData.needsReview ? 1 : 0,
      snSource: partData.snSource || 'auto',
      minQty: partData.minQty || 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const created = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
    return { success: true, data: rowToPart(created) };
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed: parts.serial_number')) {
      return { success: false, error: { code: 'DUPLICATE_SERIAL', message: `Serial number sudah ada: ${data.serialNumber}` } };
    }
    if (err.message.includes('UNIQUE constraint failed: parts.qr_id')) {
      return { success: false, error: { code: 'DUPLICATE_QR_ID', message: `QR ID sudah ada: ${data.qrId}` } };
    }
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Ambil satu part berdasarkan ID
 */
function getPartById(id) {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM parts WHERE id = ? AND is_deleted = 0').get(id);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Part tidak ditemukan: ${id}` } };
    }
    return { success: true, data: rowToPart(row) };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Ambil part berdasarkan QR ID
 */
function getPartByQrId(qrId) {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM parts WHERE qr_id = ? AND is_deleted = 0').get(qrId);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: `QR ID tidak ditemukan: ${qrId}` } };
    }
    return { success: true, data: rowToPart(row) };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Ambil part berdasarkan serial number
 */
function getPartBySerialNumber(serialNumber) {
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM parts WHERE serial_number = ? AND is_deleted = 0'
    ).get(serialNumber);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Serial number tidak ditemukan: ${serialNumber}` } };
    }
    return { success: true, data: rowToPart(row) };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Ambil semua parts dengan filter opsional
 * @param {Object} filters - { search, category, status, needsReview, sortBy, sortDir, limit, offset }
 */
function getParts(filters = {}) {
  try {
    const db = getDb();
    const {
      search,
      category,
      status,
      needsReview,
      sortBy = 'created_at',
      sortDir = 'DESC',
      limit = 500,
      offset = 0,
    } = filters;

    const conditions = ['is_deleted = 0'];
    const params = [];

    if (search) {
      conditions.push(
        '(description LIKE ? OR serial_number LIKE ? OR qr_id LIKE ? OR mr_invoice LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (status === 'OUT') {
      conditions.push('current_qty <= 0');
    } else if (status === 'LOW') {
      conditions.push('current_qty > 0 AND min_qty > 0 AND current_qty <= min_qty');
    } else if (status === 'OK') {
      conditions.push('(min_qty = 0 OR current_qty > min_qty)');
    } else if (status === 'REVIEW') {
      conditions.push('needs_review = 1');
    }

    if (needsReview) {
      conditions.push('needs_review = 1');
    }

    // Whitelist sortBy untuk keamanan
    const allowedSortCols = ['created_at', 'updated_at', 'description', 'current_qty', 'date_entry', 'category'];
    const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'created_at';
    const safeSortDir = sortDir === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT * FROM parts
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${safeSortBy} ${safeSortDir}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const rows = db.prepare(sql).all(...params);
    return { success: true, data: rows.map(rowToPart) };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Update data part
 */
function updatePart(id, data) {
  try {
    const db = getDb();
    const timestamp = now();

    // Build dynamic SET clause
    const allowed = [
      'date_entry', 'mr_invoice', 'purchase_order', 'description',
      'category', 'category_confidence', 'category_auto', 'needs_review',
      'unit', 'min_qty', 'qr_id', 'qr_generated_at', 'qr_payload_hash',
      'image_path', 'current_qty',
    ];

    const sets = [];
    const values = [];

    // Map camelCase to snake_case
    const fieldMap = {
      dateEntry: 'date_entry', mrInvoice: 'mr_invoice', purchaseOrder: 'purchase_order',
      description: 'description', category: 'category', categoryConfidence: 'category_confidence',
      categoryAuto: 'category_auto', needsReview: 'needs_review', unit: 'unit',
      minQty: 'min_qty', qrId: 'qr_id', qrGeneratedAt: 'qr_generated_at',
      qrPayloadHash: 'qr_payload_hash', imagePath: 'image_path', currentQty: 'current_qty',
    };

    for (const [key, val] of Object.entries(data)) {
      const col = fieldMap[key];
      if (col && allowed.includes(col)) {
        sets.push(`${col} = ?`);
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    if (sets.length === 0) {
      return { success: false, error: { code: 'NO_CHANGES', message: 'Tidak ada field yang valid untuk diupdate' } };
    }

    sets.push('updated_at = ?');
    values.push(timestamp);
    values.push(id);

    const result = db.prepare(
      `UPDATE parts SET ${sets.join(', ')} WHERE id = ? AND is_deleted = 0`
    ).run(...values);

    if (result.changes === 0) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Part tidak ditemukan: ${id}` } };
    }

    const updated = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
    return { success: true, data: rowToPart(updated) };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Soft delete part
 */
function deletePart(id) {
  try {
    const db = getDb();
    const result = db.prepare(
      'UPDATE parts SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND is_deleted = 0'
    ).run(now(), now(), id);

    if (result.changes === 0) {
      return { success: false, error: { code: 'NOT_FOUND', message: `Part tidak ditemukan: ${id}` } };
    }
    return { success: true, data: { deleted: true } };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Soft delete multiple parts dalam satu transaksi
 * @param {string[]} ids
 */
function deletePartsBatch(ids) {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'Daftar ID tidak boleh kosong' } };
    }

    const db = getDb();
    const timestamp = now();
    const stmt = db.prepare(
      'UPDATE parts SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND is_deleted = 0'
    );

    const deleteTx = db.transaction((idList) => {
      let count = 0;
      for (const id of idList) {
        const res = stmt.run(timestamp, timestamp, id);
        count += res.changes;
      }
      return count;
    });

    const deletedCount = deleteTx(ids);
    return { success: true, data: { deletedCount, totalRequested: ids.length } };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}


/**
 * Ambil KPI stats
 */
function getKpiStats() {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    const totalSku = db.prepare("SELECT COUNT(*) as c FROM parts WHERE is_deleted = 0").get().c;
    const totalItems = db.prepare("SELECT COALESCE(SUM(current_qty), 0) as c FROM parts WHERE is_deleted = 0").get().c;
    const outCount = db.prepare("SELECT COUNT(*) as c FROM parts WHERE is_deleted = 0 AND current_qty <= 0").get().c;
    const lowCount = db.prepare(
      "SELECT COUNT(*) as c FROM parts WHERE is_deleted = 0 AND current_qty > 0 AND min_qty > 0 AND current_qty <= min_qty"
    ).get().c;
    const reviewCount = db.prepare("SELECT COUNT(*) as c FROM parts WHERE is_deleted = 0 AND needs_review = 1").get().c;

    const inToday = db.prepare(
      "SELECT COALESCE(SUM(quantity), 0) as c FROM transactions WHERE direction = 'IN' AND date(scanned_at) = ? AND is_undone = 0"
    ).get(today).c;
    const outToday = db.prepare(
      "SELECT COALESCE(SUM(quantity), 0) as c FROM transactions WHERE direction = 'OUT' AND date(scanned_at) = ? AND is_undone = 0"
    ).get(today).c;

    return {
      success: true,
      data: { totalSku, totalItems, outCount, lowCount, reviewCount, inToday, outToday },
    };
  } catch (err) {
    return { success: false, error: { code: 'DB_ERROR', message: err.message } };
  }
}

/**
 * Seed realistic warehouse demo data (8-12 diverse items across categories with sample transactions)
 */
function seedDemoData() {
  try {
    const db = getDb();
    const demoItems = [
      {
        description: 'Baut Hex Head M10 x 30mm SS304',
        category: 'Mechanical/Fastener',
        initialQty: 250,
        currentQty: 210,
        minQty: 50,
        unit: 'pcs',
        mrInvoice: 'INV-2026-1001',
        purchaseOrder: 'PO-2026-5001',
        dateEntry: '2026-08-01',
      },
      {
        description: 'Deep Groove Ball Bearing 6205-2RS SKF',
        category: 'Mechanical/Bearing',
        initialQty: 40,
        currentQty: 6,
        minQty: 10,
        unit: 'pcs',
        mrInvoice: 'INV-2026-1002',
        purchaseOrder: 'PO-2026-5002',
        dateEntry: '2026-08-03',
      },
      {
        description: 'O-Ring NBR70 ID 25mm x 3.5mm Seal',
        category: 'Mechanical/Seal',
        initialQty: 100,
        currentQty: 0,
        minQty: 20,
        unit: 'pcs',
        mrInvoice: 'INV-2026-1003',
        purchaseOrder: 'PO-2026-5003',
        dateEntry: '2026-08-05',
      },
      {
        description: 'Kabel NYYHY 3 x 2.5mm² Supreme 500V',
        category: 'Electrical/Cable',
        initialQty: 300,
        currentQty: 185,
        minQty: 50,
        unit: 'meter',
        mrInvoice: 'INV-2026-1004',
        purchaseOrder: 'PO-2026-5004',
        dateEntry: '2026-08-07',
      },
      {
        description: 'Magnetic Contactor 3P 32A LC1D32 Schneider',
        category: 'Electrical/Component',
        initialQty: 15,
        currentQty: 12,
        minQty: 4,
        unit: 'unit',
        mrInvoice: 'INV-2026-1005',
        purchaseOrder: 'PO-2026-5005',
        dateEntry: '2026-08-09',
      },
      {
        description: 'Pressure Gauge 0-10 Bar G 1/2 Bottom Wika',
        category: 'Instrument/Pressure',
        initialQty: 20,
        currentQty: 4,
        minQty: 5,
        unit: 'unit',
        mrInvoice: 'INV-2026-1006',
        purchaseOrder: 'PO-2026-5006',
        dateEntry: '2026-08-10',
      },
      {
        description: 'Pelumas Shell Tellus S2 MX 68 Hydraulic Oil',
        category: 'Consumable/Lubricant',
        initialQty: 200,
        currentQty: 160,
        minQty: 40,
        unit: 'liter',
        mrInvoice: 'INV-2026-1007',
        purchaseOrder: 'PO-2026-5007',
        dateEntry: '2026-08-11',
      },
      {
        description: 'Helm Proyek V-Gard Full Brim MSA Putih',
        category: 'Safety',
        initialQty: 50,
        currentQty: 45,
        minQty: 10,
        unit: 'unit',
        mrInvoice: 'INV-2026-1008',
        purchaseOrder: 'PO-2026-5008',
        dateEntry: '2026-08-12',
      },
      {
        description: 'Kunci Pas Ring Set 8-24mm 14 Pcs Tekiro',
        category: 'Tool',
        initialQty: 8,
        currentQty: 8,
        minQty: 2,
        unit: 'set',
        mrInvoice: 'INV-2026-1009',
        purchaseOrder: 'PO-2026-5009',
        dateEntry: '2026-08-13',
      },
      {
        description: 'Barang Khusus Custom Import Perlu Validasi',
        category: 'Uncategorized',
        initialQty: 30,
        currentQty: 30,
        minQty: 5,
        needsReview: true,
        unit: 'pcs',
        mrInvoice: 'INV-2026-1010',
        purchaseOrder: 'PO-2026-5010',
        dateEntry: '2026-08-14',
      }
    ];

    let createdCount = 0;
    for (const item of demoItems) {
      const created = createPart(item);
      if (created.success) {
        createdCount++;
        // If currentQty differs from initialQty, update it
        if (item.currentQty !== item.initialQty) {
          updatePart(created.data.id, { currentQty: item.currentQty });
        }
      }
    }

    return { success: true, data: { createdCount } };
  } catch (err) {
    return { success: false, error: { code: 'SEED_ERROR', message: err.message } };
  }
}

module.exports = {
  createPart,
  getPartById,
  getPartByQrId,
  getPartBySerialNumber,
  getParts,
  updatePart,
  deletePart,
  deletePartsBatch,
  getKpiStats,
  seedDemoData,
};

