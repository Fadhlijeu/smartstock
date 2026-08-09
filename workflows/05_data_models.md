# 05 — Data Models
## SAP StockMon · Skema Database SQLite & Struktur Data

---

## Database: SQLite (better-sqlite3)

### Tabel: `parts`

```sql
CREATE TABLE parts (
    id              TEXT PRIMARY KEY,     -- UUID v4
    qr_id           TEXT NOT NULL UNIQUE, -- "QR-2026-0001"
    
    -- Field utama (dari user / CSV)
    date_entry      TEXT NOT NULL,        -- "2026-08-09" (ISO date)
    mr_invoice      TEXT NOT NULL,        -- "INV-2026-1234" (MR Invoice company)
    purchase_order  TEXT NOT NULL,        -- "PO-2026-5678"
    serial_number   TEXT NOT NULL UNIQUE, -- "BOLT-2026-0001"
    initial_qty     INTEGER NOT NULL,     -- Quantity saat pertama diinput
    current_qty     INTEGER NOT NULL,     -- Quantity saat ini (berubah setelah scan)
    unit            TEXT DEFAULT 'pcs',   -- "pcs", "meter", "kg", "set", dll
    description     TEXT NOT NULL,        -- Deskripsi barang
    
    -- Auto-classification
    category        TEXT DEFAULT 'Uncategorized',  -- "Mechanical/Fastener"
    category_confidence REAL DEFAULT 0,   -- 0.0 - 1.0
    category_auto   INTEGER DEFAULT 1,    -- 1 = auto, 0 = manual override
    needs_review    INTEGER DEFAULT 0,    -- 1 = flagged for review
    
    -- QR Data
    qr_generated_at TEXT,                 -- ISO timestamp
    qr_payload_hash TEXT,                 -- MD5 hash of QR payload (detect stale)
    
    -- Image
    image_path      TEXT,                 -- Path relatif ke gambar part
    
    -- Serial Number metadata
    sn_source       TEXT DEFAULT 'auto',  -- "auto" | "manual" | "csv"
    
    -- Stock alert thresholds
    min_qty         INTEGER DEFAULT 0,    -- Qty minimum (Low threshold)
    
    -- Soft delete
    is_deleted      INTEGER DEFAULT 0,
    deleted_at      TEXT,
    
    -- Timestamps
    created_at      TEXT NOT NULL,        -- ISO 8601
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_parts_qr_id ON parts(qr_id);
CREATE INDEX idx_parts_serial ON parts(serial_number);
CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_mr_invoice ON parts(mr_invoice);
CREATE INDEX idx_parts_needs_review ON parts(needs_review) WHERE needs_review = 1;
CREATE INDEX idx_parts_deleted ON parts(is_deleted) WHERE is_deleted = 0;
```

---

### Tabel: `transactions`

```sql
CREATE TABLE transactions (
    id              TEXT PRIMARY KEY,     -- UUID v4
    part_id         TEXT NOT NULL REFERENCES parts(id),
    qr_id           TEXT NOT NULL,        -- snapshot QR ID saat scan
    
    direction       TEXT NOT NULL,        -- "IN" | "OUT"
    quantity        INTEGER NOT NULL DEFAULT 1,  -- berapa unit yg di-scan
    qty_before      INTEGER NOT NULL,     -- snapshot qty sebelum transaksi
    qty_after       INTEGER NOT NULL,     -- snapshot qty setelah transaksi
    
    -- Source info
    scan_method     TEXT DEFAULT 'hid',   -- "hid" | "webcam" | "manual"
    operator        TEXT,                 -- nama operator (opsional)
    note            TEXT,                 -- catatan tambahan
    
    -- Undo support
    is_undone       INTEGER DEFAULT 0,
    undone_at       TEXT,
    undone_by       TEXT,
    
    -- Timestamps
    scanned_at      TEXT NOT NULL         -- ISO 8601 dengan timezone
);

CREATE INDEX idx_transactions_part_id ON transactions(part_id);
CREATE INDEX idx_transactions_scanned_at ON transactions(scanned_at DESC);
CREATE INDEX idx_transactions_direction ON transactions(direction);
CREATE INDEX idx_transactions_qr_id ON transactions(qr_id);
```

---

### Tabel: `categories`

```sql
CREATE TABLE categories (
    id              TEXT PRIMARY KEY,
    path            TEXT NOT NULL UNIQUE, -- "Mechanical/Fastener"
    name            TEXT NOT NULL,        -- "Fastener"
    parent_path     TEXT,                 -- "Mechanical" (null untuk root)
    icon            TEXT,                 -- Material Symbol name: "hardware"
    color_hex       TEXT DEFAULT '#888888',
    sort_order      INTEGER DEFAULT 0,
    is_system       INTEGER DEFAULT 1,    -- 1 = builtin, 0 = user-created
    created_at      TEXT NOT NULL
);

CREATE INDEX idx_categories_parent ON categories(parent_path);
```

---

### Tabel: `classification_rules` (User-Defined)

```sql
CREATE TABLE classification_rules (
    id              TEXT PRIMARY KEY,
    keywords        TEXT NOT NULL,        -- JSON array: ["baut", "bolt", "screw"]
    category_path   TEXT NOT NULL REFERENCES categories(path),
    confidence      REAL DEFAULT 0.9,
    priority        INTEGER DEFAULT 100,  -- lebih tinggi = lebih diprioritaskan
    is_active       INTEGER DEFAULT 1,
    created_from    TEXT,                 -- "user_override" | "csv_import" | "manual"
    created_at      TEXT NOT NULL
);
```

---

### Tabel: `import_batches`

```sql
CREATE TABLE import_batches (
    id              TEXT PRIMARY KEY,
    filename        TEXT,                 -- nama file CSV asli
    status          TEXT DEFAULT 'pending', -- "pending" | "processing" | "done" | "failed"
    total_rows      INTEGER DEFAULT 0,
    success_rows    INTEGER DEFAULT 0,
    failed_rows     INTEGER DEFAULT 0,
    skipped_rows    INTEGER DEFAULT 0,    -- duplikat yang di-skip
    result_json     TEXT,                 -- detail per baris
    created_at      TEXT NOT NULL,
    completed_at    TEXT
);
```

---

### Tabel: `settings`

```sql
CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,        -- JSON-encoded value
    updated_at      TEXT NOT NULL
);

-- Contoh entries:
-- key='app.theme', value='"dark"'
-- key='scanner.beep', value='true'
-- key='qr.error_correction', value='"M"'
-- key='backup.auto', value='{"enabled":true,"path":"C:/backup","time":"23:00"}'
-- key='stock.min_qty_default', value='5'
-- key='display.grid_size', value='"medium"'
-- key='display.columns', value='4'
```

---

### Tabel: `qr_sequences`

```sql
CREATE TABLE qr_sequences (
    year            INTEGER PRIMARY KEY,
    last_seq        INTEGER DEFAULT 0,
    updated_at      TEXT NOT NULL
);
-- Auto-insert year jika belum ada
-- Guarantee atomicity: UPDATE qr_sequences SET last_seq = last_seq + 1 WHERE year = ?
```

---

## Data Models (JavaScript)

### Part

```javascript
/**
 * @typedef {Object} Part
 * @property {string} id - UUID
 * @property {string} qrId - QR unique ID (QR-YYYY-NNNN)
 * @property {string} dateEntry - ISO date string (YYYY-MM-DD)
 * @property {string} mrInvoice - MR Invoice number
 * @property {string} purchaseOrder - PO number
 * @property {string} serialNumber - Serial number
 * @property {number} initialQty - Initial quantity
 * @property {number} currentQty - Current stock quantity
 * @property {string} unit - Unit of measure (pcs, meter, kg, dll)
 * @property {string} description - Part description
 * @property {string} category - Category path (e.g. "Mechanical/Fastener")
 * @property {number} categoryConfidence - 0.0 to 1.0
 * @property {boolean} categoryAuto - Was auto-classified?
 * @property {boolean} needsReview - Flagged for manual review?
 * @property {string|null} imagePath - Relative path to image
 * @property {number} minQty - Minimum stock alert threshold
 * @property {boolean} isDeleted - Soft delete flag
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

// Stock status helper
function getStockStatus(part) {
  if (part.currentQty <= 0) return 'OUT';          // merah
  if (part.currentQty <= part.minQty) return 'LOW'; // kuning
  return 'OK';                                       // hijau
}
```

### Transaction

```javascript
/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} partId
 * @property {string} qrId
 * @property {'IN'|'OUT'} direction
 * @property {number} quantity
 * @property {number} qtyBefore
 * @property {number} qtyAfter
 * @property {'hid'|'webcam'|'manual'} scanMethod
 * @property {string|null} operator
 * @property {string|null} note
 * @property {boolean} isUndone
 * @property {string} scannedAt - ISO timestamp
 */
```

### Import Result

```javascript
/**
 * @typedef {Object} ImportResult
 * @property {string} batchId
 * @property {number} total
 * @property {number} success
 * @property {number} failed
 * @property {number} skipped
 * @property {ImportRowResult[]} rows
 */

/**
 * @typedef {Object} ImportRowResult
 * @property {number} rowIndex
 * @property {'success'|'failed'|'skipped'} status
 * @property {string|null} partId - null jika failed
 * @property {string|null} error - error message jika failed
 * @property {string|null} warning - warning jika ada
 * @property {ClassificationResult} classification
 */
```

### Classification Result

```javascript
/**
 * @typedef {Object} ClassificationResult
 * @property {string} category - Category path
 * @property {number} confidence - 0.0 to 1.0
 * @property {boolean} autoAssigned - true jika confidence >= 0.7
 * @property {CategoryCandidate[]} candidates - top 3 alternatives
 */

/**
 * @typedef {Object} CategoryCandidate
 * @property {string} category
 * @property {number} score
 * @property {string[]} matchedKeywords
 */
```

---

## CSV Template Format

### Template untuk Import

```csv
Date,MR Invoice,Purchase Order,Serial Number,Quantity,Unit,Description,Category (optional),Min Qty
2026-08-09,INV-2026-001,PO-2026-100,,50,pcs,Baut M6 Stainless Steel,,0
2026-08-09,INV-2026-001,PO-2026-100,,30,pcs,Mur M6 Stainless Steel,,0
2026-08-09,INV-2026-002,PO-2026-101,CABLE-001,100,meter,Kabel NYA 2.5mm Merah,Electrical/Cable,10
```

**Aturan CSV:**
- `Serial Number` boleh kosong → auto-generate
- `Category (optional)` boleh kosong → auto-classify
- `Min Qty` boleh kosong → default 0
- `Date` format: YYYY-MM-DD
- Encoding: UTF-8 (penting untuk karakter Indonesia)

---

## Database Migrations

```javascript
// db/migrations/index.js
const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema',
    sql: `
      CREATE TABLE IF NOT EXISTS parts ( ... );
      CREATE TABLE IF NOT EXISTS transactions ( ... );
      CREATE TABLE IF NOT EXISTS categories ( ... );
      CREATE TABLE IF NOT EXISTS settings ( ... );
      CREATE TABLE IF NOT EXISTS qr_sequences ( ... );
      CREATE TABLE IF NOT EXISTS import_batches ( ... );
      CREATE TABLE IF NOT EXISTS classification_rules ( ... );
      
      -- Insert default categories
      INSERT OR IGNORE INTO categories (id, path, name, ...) VALUES ...;
      
      -- Insert default settings
      INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
        ('app.theme', '"dark"', datetime('now')),
        ('scanner.beep', 'true', datetime('now')),
        ('qr.error_correction', '"M"', datetime('now'));
    `
  },
  {
    version: 2,
    description: 'Add part images support',
    sql: `ALTER TABLE parts ADD COLUMN image_path TEXT;`
  }
];

// Auto-run migrations on startup
function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
  
  const applied = db.prepare('SELECT version FROM schema_migrations').all()
    .map(r => r.version);
  
  for (const migration of MIGRATIONS) {
    if (!applied.includes(migration.version)) {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(
        migration.version, new Date().toISOString()
      );
    }
  }
}
```

---

## File Storage Structure

```
data/
├── stockmon.db              ← SQLite database utama
├── backups/
│   ├── stockmon_20260809.db ← Auto-backup harian
│   └── stockmon_20260808.db
│
├── images/
│   └── parts/
│       ├── {part_id}.jpg   ← Gambar part (di-resize ke max 800×800)
│       └── {part_id}.png
│
└── exports/
    ├── StockReport_20260809.xlsx
    └── QRLabels_Batch_001.pdf
```
