# 02 — Architecture
## SAP StockMon · Arsitektur Teknis

---

## Gambaran Besar

SAP StockMon dibangun dengan **Electron** sebagai shell desktop, menggunakan **Node.js main process** sebagai backend dan **HTML/CSS/JS vanilla** sebagai frontend. Arsitektur dipilih untuk:

1. Tidak butuh internet (fully offline)
2. Deploy mudah: satu .exe installer
3. Akses langsung ke filesystem dan USB device
4. Performa tinggi untuk SQLite operations

```
┌─────────────────────────────────────────────────────────────────┐
│                       RENDERER PROCESS (UI)                      │
│         HTML + Vanilla CSS + Vanilla JS (ESM modules)            │
│    Dashboard · Grid Monitor · Forms · Scanner View · Reports     │
├─────────────────────────────────────────────────────────────────┤
│                      IPC BRIDGE (contextBridge)                  │
│              Preload script — secure channel                     │
├─────────────────────────────────────────────────────────────────┤
│                       MAIN PROCESS (Node.js)                     │
│    Database · QR Generator · File I/O · Excel Export · Scanner   │
├─────────────────────────────────────────────────────────────────┤
│                       ELECTRON SHELL                             │
│              BrowserWindow · Menu · Tray · Auto-updater          │
├─────────────────────────────────────────────────────────────────┤
│                       INFRASTRUCTURE                             │
│         SQLite (better-sqlite3) · Filesystem · USB HID           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modul Utama

### A. Core Data Module

```
CoreDataModule/
├── db.js                    — SQLite connection + migration manager
├── parts.repository.js      — CRUD operations untuk parts
├── transactions.repository.js — CRUD untuk scan transactions
├── categories.repository.js — CRUD untuk kategori
├── migrations/
│   ├── 001_initial.sql      — Schema awal
│   ├── 002_add_images.sql   — Kolom gambar
│   └── 003_add_categories.sql
└── backup.js                — Auto-backup logic
```

**SQLite Strategy:**
- `better-sqlite3`: synchronous API, lebih sederhana di main process
- WAL mode: Write-Ahead Logging untuk performa write yang lebih baik
- Prepared statements untuk semua queries (keamanan + performa)
- Transaction batching untuk bulk imports

---

### B. Part Upload & Processing Module

```
PartProcessor/
├── csv.parser.js            — Parse CSV upload, validate columns
├── form.validator.js        — Validasi form input manual
├── serial.generator.js      — Auto-generate serial numbers incremental
├── duplicate.detector.js    — Cek duplikat via serial number + hash
└── batch.manager.js         — Manage batch processing state
```

**Upload Flow:**
```
User upload CSV / input form
    ↓
[CSV Parser] → validate columns, parse rows
    ↓
[Duplicate Detector] → check against DB
    ↓
[Classification Engine] → auto-classify each part
    ↓
[Serial Generator] → assign serial if missing
    ↓
[QR Generator] → create QR for each unique part
    ↓
[DB Write] → insert parts + categories
    ↓
[Dashboard Update] → push event ke renderer
```

---

### C. Auto-Classification Engine

```
ClassificationEngine/
├── classifier.js            — Main classification logic
├── rules.engine.js          — Rule-based keyword matching
├── category.manager.js      — Category tree management
├── homogen.detector.js      — Detect homogeneous batch
├── heterogen.splitter.js    — Split heterogeneous batch
└── rules/
    ├── electrical.rules.json   — Keyword rules untuk barang listrik
    ├── mechanical.rules.json   — Keyword rules untuk barang mekanik
    ├── consumable.rules.json   — Keyword rules untuk consumables
    └── custom.rules.json       — User-defined rules (writable)
```

**Classification Logic (Rule-Based):**
```
Input: {name: "Baut M6 Stainless", description: "Fastener 6mm"}

Step 1: Tokenize → ["baut", "m6", "stainless", "fastener", "6mm"]

Step 2: Match against rules:
  - "baut" → match: mechanical.fastener (confidence: 0.9)
  - "stainless" → match: material.metal (confidence: 0.7)
  - "fastener" → match: mechanical.fastener (confidence: 0.95)

Step 3: Aggregate → category: "Mechanical > Fastener" (confidence: 0.92)

Step 4: If confidence < 0.5 → "Uncategorized" + flag for review

Output: {category: "Mechanical/Fastener", confidence: 0.92, autoAssigned: true}
```

**Homogen Detection:**
```
Batch of parts:
  [Baut M6 x50] → tokens: [baut, m6]
  [Baut M6 x100] → tokens: [baut, m6]
  [Baut M8 x30] → tokens: [baut, m8]

Similarity matrix:
  Baut M6 x50 ↔ Baut M6 x100: 0.95 → HOMOGEN (group, sum qty)
  Baut M8 x30: unique type → separate QR

Result:
  Group 1: Baut M6 → QR-001, qty: 150
  Group 2: Baut M8 → QR-002, qty: 30
```

---

### D. QR/Barcode Generation Module

```
QRModule/
├── qr.generator.js          — Core QR generation (node-qrcode)
├── barcode.generator.js     — 1D barcode fallback (bwip-js)
├── payload.builder.js       — Build JSON payload untuk QR
├── label.renderer.js        — Generate QR label (HTML → canvas → PNG)
├── batch.exporter.js        — Batch export ke PDF (multi-label sheet)
└── sequence.manager.js      — Manage incremental QR numbering
```

**QR Payload Format:**
```json
{
  "v": 1,
  "id": "QR-2026-0001",
  "sn": "BOLT-2026-0001",
  "sku": "MECH-FAST-001",
  "mr": "INV-2026-1234",
  "po": "PO-2026-5678",
  "qty": 150,
  "cat": "Mechanical/Fastener",
  "ts": 1753084800
}
```

**Label Format (Physical Print):**
```
┌─────────────────────────────────────┐
│  ██████████████████  Baut M6        │
│  ██      ████        SN: BOLT-001   │
│  ██  ██  ████        QTY: 150 pcs   │
│  ██      ████        MR: INV-1234   │
│  ██████████████████                 │
│  QR-2026-0001                       │
└─────────────────────────────────────┘
```

---

### E. Scanner Module

```
ScannerModule/
├── hid.listener.js          — USB HID keyboard buffer (main process)
├── webcam.scanner.js        — WebRTC + ZXing (renderer process)
├── manual.input.js          — Keyboard manual input handler
├── scan.validator.js        — Validasi payload QR, cek DB
├── transaction.creator.js   — Buat transaksi dari scan event
└── feedback.player.js       — Audio feedback (beep sukses/error)
```

**Scan Flow:**
```
Input (USB/Webcam/Manual)
    ↓
[HID Buffer] → collect chars until \n (USB scanner sends Enter)
    ↓
[QR Parser] → parse JSON payload dari QR string
    ↓
[Scan Validator]:
  - Part exists in DB? → Error jika tidak
  - Direction toggle (IN/OUT)?
  - Duplicate scan? (same part, same direction, < 60s) → Warning
    ↓
[Transaction Creator] → INSERT transaction record
    ↓
[Stock Updater] → UPDATE part quantity
    ↓
[Dashboard Event] → ipcMain.emit('stock-updated', partId)
    ↓
[Renderer] → update card di grid
    ↓
[Feedback] → beep sukses
```

---

### F. Dashboard & UI Module

```
Renderer/
├── index.html               — Main window entry
├── css/
│   ├── tokens.css           — Design tokens (colors, spacing, type)
│   ├── components.css       — Component styles
│   ├── grid.css             — Grid layout sistem
│   └── animations.css       — Micro-animations
├── js/
│   ├── app.js               — Main app controller
│   ├── router.js            — SPA router (hash-based)
│   ├── state.js             — App state management (pubsub)
│   ├── views/
│   │   ├── dashboard.js     — Grid monitor view
│   │   ├── parts.js         — Part management view
│   │   ├── scanner.js       — Scanner interface
│   │   ├── transactions.js  — Transaction history
│   │   ├── reports.js       — Export & reports
│   │   └── settings.js      — App settings
│   └── components/
│       ├── grid-card.js     — Part grid card component
│       ├── scan-bar.js      — Scanner input bar
│       ├── modal.js         — Modal dialog system
│       ├── toast.js         — Toast notification
│       └── data-table.js    — Sortable/filterable table
└── assets/
    └── sounds/
        ├── beep-success.mp3
        └── beep-error.mp3
```

---

### G. Export Module

```
ExportModule/
├── excel.exporter.js        — ExcelJS untuk .xlsx
├── pdf.exporter.js          — jsPDF untuk .pdf
├── templates/
│   ├── stock-snapshot.js    — Template stock report
│   └── transaction-log.js   — Template transaction report
└── formatter.js             — Number, date, currency formatting
```

---

## IPC API (Main ↔ Renderer)

### Main → Renderer Events (Real-time)
```javascript
// Stock berubah setelah scan
ipcMain.on('stock-updated', { partId, newQty, direction })

// Scan error
ipcMain.on('scan-error', { code, message, rawData })

// Import progress
ipcMain.on('import-progress', { current, total, status })
```

### Renderer → Main Calls (invoke)
```javascript
// Part CRUD
window.api.getParts(filters)          → Part[]
window.api.createPart(data)           → Part
window.api.updatePart(id, data)       → Part
window.api.deletePart(id)             → boolean

// QR
window.api.generateQR(partId)         → { png: base64, svg: string }
window.api.generateBatchQR(partIds)   → Blob (PDF)

// Transactions
window.api.getTransactions(filters)   → Transaction[]
window.api.createTransaction(data)    → Transaction
window.api.undoLastTransaction()      → boolean

// Export
window.api.exportExcel(type, filters) → { path: string }
window.api.exportPDF(type, filters)   → { path: string }

// Import
window.api.importCSV(filePath)        → ImportResult
window.api.downloadCSVTemplate()      → void

// Settings
window.api.getSettings()              → Settings
window.api.updateSettings(data)       → Settings
```

---

## State Management (Frontend)

Tidak menggunakan framework. Gunakan **pub/sub pattern** sederhana:

```javascript
// state.js
class AppState {
  constructor() {
    this._state = { parts: [], transactions: [], filters: {} };
    this._listeners = {};
  }

  subscribe(key, fn) { /* ... */ }
  emit(key, data) { /* notify all listeners */ }
  update(key, updater) { /* update + emit */ }
}

export const state = new AppState();

// Usage:
state.subscribe('parts', (parts) => renderGrid(parts));
state.update('parts', (old) => [...old, newPart]);
```

---

## File Structure Lengkap

```
SAP - Buat tata/
├── package.json
├── electron.config.js       — Electron builder config
├── .gitignore
├── workflows/               — Dokumentasi proyek ini
│
├── src/
│   ├── main/                — Node.js main process
│   │   ├── index.js         — Entry point
│   │   ├── preload.js       — Context bridge
│   │   ├── window.js        — BrowserWindow setup
│   │   ├── menu.js          — App menu
│   │   ├── ipc-handlers.js  — IPC handler registry
│   │   │
│   │   ├── db/              — Database module
│   │   ├── parts/           — Part processing
│   │   ├── classifier/      — Auto-classification
│   │   ├── qr/              — QR generation
│   │   ├── scanner/         — Scanner handling
│   │   └── export/          — Excel/PDF export
│   │
│   └── renderer/            — Frontend (HTML/CSS/JS)
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── assets/
│
├── data/                    — Runtime data (gitignored)
│   ├── stockmon.db          — SQLite database
│   └── backups/
│
└── dist/                    — Build output (gitignored)
```

---

## Error Handling Strategy

```
Layer 1: Input Validation
  → Validate di frontend sebelum kirim ke main
  → Clear error messages per field

Layer 2: Business Logic Errors (main process)
  → Throw typed errors: DuplicatePartError, InvalidQRError, etc.
  → IPC returns { success: false, error: { code, message } }

Layer 3: Database Errors
  → Wrap semua DB ops dalam try-catch
  → Rollback transaction jika dalam transaction block
  → Log ke file: logs/error.log

Layer 4: Fatal Errors
  → uncaughtException handler
  → Save crash report ke filesystem
  → Show user-friendly dialog, offer restart
```
