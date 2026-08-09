-- Migration 001: Initial Schema
-- SAP StockMon — Database Schema v1

-- ─── SCHEMA MIGRATIONS TRACKER ────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at  TEXT NOT NULL
);

-- ─── PARTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts (
    id                  TEXT PRIMARY KEY,       -- UUID v4
    qr_id               TEXT NOT NULL UNIQUE,   -- "QR-2026-0001"

    -- Field utama
    date_entry          TEXT NOT NULL,          -- "2026-08-09" (ISO date)
    mr_invoice          TEXT NOT NULL,          -- "INV-2026-1234"
    purchase_order      TEXT NOT NULL,          -- "PO-2026-5678"
    serial_number       TEXT NOT NULL UNIQUE,   -- "BOLT-2026-0001"
    initial_qty         INTEGER NOT NULL,
    current_qty         INTEGER NOT NULL,
    unit                TEXT DEFAULT 'pcs',
    description         TEXT NOT NULL,

    -- Auto-classification
    category            TEXT DEFAULT 'Uncategorized',
    category_confidence REAL DEFAULT 0,
    category_auto       INTEGER DEFAULT 1,      -- 1=auto, 0=manual
    needs_review        INTEGER DEFAULT 0,

    -- QR
    qr_generated_at     TEXT,
    qr_payload_hash     TEXT,

    -- Image
    image_path          TEXT,

    -- Serial number metadata
    sn_source           TEXT DEFAULT 'auto',    -- "auto"|"manual"|"csv"

    -- Stock alert
    min_qty             INTEGER DEFAULT 0,

    -- Soft delete
    is_deleted          INTEGER DEFAULT 0,
    deleted_at          TEXT,

    -- Timestamps
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parts_qr_id       ON parts(qr_id);
CREATE INDEX IF NOT EXISTS idx_parts_serial      ON parts(serial_number);
CREATE INDEX IF NOT EXISTS idx_parts_category    ON parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_mr_invoice  ON parts(mr_invoice);
CREATE INDEX IF NOT EXISTS idx_parts_needs_review ON parts(needs_review) WHERE needs_review = 1;
CREATE INDEX IF NOT EXISTS idx_parts_active      ON parts(is_deleted) WHERE is_deleted = 0;

-- ─── TRANSACTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    part_id     TEXT NOT NULL REFERENCES parts(id),
    qr_id       TEXT NOT NULL,

    direction   TEXT NOT NULL CHECK(direction IN ('IN', 'OUT')),
    quantity    INTEGER NOT NULL DEFAULT 1,
    qty_before  INTEGER NOT NULL,
    qty_after   INTEGER NOT NULL,

    -- Source info
    scan_method TEXT DEFAULT 'hid' CHECK(scan_method IN ('hid', 'webcam', 'manual')),
    operator    TEXT,
    note        TEXT,

    -- Undo
    is_undone   INTEGER DEFAULT 0,
    undone_at   TEXT,
    undone_by   TEXT,

    scanned_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_part_id   ON transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_transactions_scanned_at ON transactions(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON transactions(direction);
CREATE INDEX IF NOT EXISTS idx_transactions_qr_id     ON transactions(qr_id);

-- ─── CATEGORIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    path        TEXT NOT NULL UNIQUE,   -- "Mechanical/Fastener"
    name        TEXT NOT NULL,          -- "Fastener"
    parent_path TEXT,
    icon        TEXT,                   -- Material Symbol name
    color_hex   TEXT DEFAULT '#888888',
    sort_order  INTEGER DEFAULT 0,
    is_system   INTEGER DEFAULT 1,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_path);

-- ─── CLASSIFICATION RULES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS classification_rules (
    id            TEXT PRIMARY KEY,
    keywords      TEXT NOT NULL,        -- JSON array
    category_path TEXT NOT NULL REFERENCES categories(path),
    confidence    REAL DEFAULT 0.9,
    priority      INTEGER DEFAULT 100,
    is_active     INTEGER DEFAULT 1,
    created_from  TEXT,
    created_at    TEXT NOT NULL
);

-- ─── IMPORT BATCHES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_batches (
    id            TEXT PRIMARY KEY,
    filename      TEXT,
    status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','done','failed')),
    total_rows    INTEGER DEFAULT 0,
    success_rows  INTEGER DEFAULT 0,
    failed_rows   INTEGER DEFAULT 0,
    skipped_rows  INTEGER DEFAULT 0,
    result_json   TEXT,
    created_at    TEXT NOT NULL,
    completed_at  TEXT
);

-- ─── SETTINGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,          -- JSON-encoded value
    updated_at  TEXT NOT NULL
);

-- ─── QR SEQUENCES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_sequences (
    year        INTEGER PRIMARY KEY,
    last_seq    INTEGER DEFAULT 0,
    updated_at  TEXT NOT NULL
);

-- ─── DEFAULT CATEGORIES ────────────────────────────────────────
INSERT OR IGNORE INTO categories (id, path, name, parent_path, icon, sort_order, is_system, created_at) VALUES
    ('cat-mech',        'Mechanical',                  'Mechanical',     NULL,           'hardware',         10, 1, datetime('now')),
    ('cat-mech-fast',   'Mechanical/Fastener',         'Fastener',       'Mechanical',   'hardware',         11, 1, datetime('now')),
    ('cat-mech-bear',   'Mechanical/Bearing',          'Bearing',        'Mechanical',   'rotate_right',     12, 1, datetime('now')),
    ('cat-mech-seal',   'Mechanical/Seal',             'Seal',           'Mechanical',   'circle',           13, 1, datetime('now')),
    ('cat-mech-pipe',   'Mechanical/Pipe & Fitting',   'Pipe & Fitting', 'Mechanical',   'plumbing',         14, 1, datetime('now')),
    ('cat-mech-belt',   'Mechanical/Belt & Chain',     'Belt & Chain',   'Mechanical',   'link',             15, 1, datetime('now')),
    ('cat-elec',        'Electrical',                  'Electrical',     NULL,           'electrical_services', 20, 1, datetime('now')),
    ('cat-elec-cable',  'Electrical/Cable',            'Cable',          'Electrical',   'cable',            21, 1, datetime('now')),
    ('cat-elec-comp',   'Electrical/Component',        'Component',      'Electrical',   'memory',           22, 1, datetime('now')),
    ('cat-elec-panel',  'Electrical/Panel',            'Panel',          'Electrical',   'dashboard',        23, 1, datetime('now')),
    ('cat-inst',        'Instrument',                  'Instrument',     NULL,           'sensors',          30, 1, datetime('now')),
    ('cat-inst-press',  'Instrument/Pressure',         'Pressure',       'Instrument',   'speed',            31, 1, datetime('now')),
    ('cat-inst-flow',   'Instrument/Flow',             'Flow',           'Instrument',   'water',            32, 1, datetime('now')),
    ('cat-cons',        'Consumable',                  'Consumable',     NULL,           'inventory',        40, 1, datetime('now')),
    ('cat-cons-lub',    'Consumable/Lubricant',        'Lubricant',      'Consumable',   'oil_barrel',       41, 1, datetime('now')),
    ('cat-cons-chem',   'Consumable/Chemical',         'Chemical',       'Consumable',   'science',          42, 1, datetime('now')),
    ('cat-tool',        'Tool',                        'Tool',           NULL,           'construction',     50, 1, datetime('now')),
    ('cat-safety',      'Safety',                      'Safety',         NULL,           'security',         60, 1, datetime('now')),
    ('cat-uncategorized','Uncategorized',              'Uncategorized',  NULL,           'category',         99, 1, datetime('now'));

-- ─── DEFAULT SETTINGS ──────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
    ('app.theme',               '"dark"',               datetime('now')),
    ('app.language',            '"id"',                 datetime('now')),
    ('scanner.beep',            'true',                 datetime('now')),
    ('scanner.beep_volume',     '0.7',                  datetime('now')),
    ('qr.error_correction',     '"M"',                  datetime('now')),
    ('qr.size',                 '256',                  datetime('now')),
    ('stock.min_qty_default',   '5',                    datetime('now')),
    ('display.grid_size',       '"medium"',             datetime('now')),
    ('display.columns',         '4',                    datetime('now')),
    ('backup.auto',             '{"enabled":false}',    datetime('now')),
    ('sidebar.collapsed',       'false',                datetime('now'));
