# 09 — Milestones & Roadmap
## SAP StockMon · Rencana Pengembangan

---

## Filosofi Pengembangan

> **"Ship working, then ship smart."**
> Aplikasi yang bisa scan dan simpan data lebih berguna dari aplikasi yang sempurna tapi belum jalan.

Setiap milestone harus menghasilkan **executable yang bisa digunakan** — bukan skeleton atau proof-of-concept.

---

## Milestone Overview

```
M0 ────── M1 ────── M2 ────── M3 ────── M4 ────── M5
Setup    Core      QR Gen &   Scanner   Grid      Polish &
& Infra  Data      Import     Live      Monitor   Export
```

---

## Milestone 0: Foundation (3-5 hari)

**Goal**: Project setup, Electron berjalan, database terbuat.

### Tasks

- [ ] Init project: `npm init`, Electron setup
- [ ] Setup `better-sqlite3` + migration system
- [ ] Implement database schema dari `05_data_models.md`
- [ ] Setup IPC bridge (preload.js + contextBridge)
- [ ] Basic app shell: sidebar + main content area
- [ ] Implement design tokens dari `06_ui_design_system.md` ke CSS
- [ ] Setup router sederhana (hash-based SPA)
- [ ] Material Symbols Outlined integration
- [ ] Inter + JetBrains Mono font loading
- [ ] Basic error handling + logging (winston)
- [ ] Setup `.gitignore`, `package.json` scripts
- [ ] GitHub repo: private, initial commit

### Deliverable

Electron app yang bisa dibuka, sidebar navigasi, tidak ada crash.

---

## Milestone 1: Core Data (1 minggu)

**Goal**: CRUD parts berjalan, database berfungsi.

### Tasks

**1A: Part Management**
- [ ] Form input part manual (semua 6 field utama)
- [ ] Form validation client-side (field required, format tanggal, qty number)
- [ ] IPC handler: createPart, getParts, updatePart, deletePart
- [ ] Part list view (tabel sederhana)
- [ ] Part detail view (baca saja, semua field)
- [ ] Soft delete dengan konfirmasi
- [ ] Duplicate detection (serial number)

**1B: CSV Import (Dasar)**
- [ ] Template CSV download
- [ ] CSV file picker + parse
- [ ] Validation per-row dengan error report
- [ ] Batch insert ke DB
- [ ] Import result summary UI

**1C: Settings**
- [ ] Settings screen scaffold
- [ ] Theme toggle: dark/light
- [ ] Data directory config

### Deliverable

Bisa input barang, lihat list, edit, hapus, import dari CSV.

---

## Milestone 2: QR Generation (1 minggu)

**Goal**: QR auto-generate, batch print, label design.

### Tasks

**2A: QR Core**
- [ ] Implement `sequence.manager.js` (QR ID incremental)
- [ ] Implement `qr.generator.js` (node-qrcode)
- [ ] Auto-generate QR saat part dibuat
- [ ] QR ID assignment per-part

**2B: QR UI**
- [ ] QR preview modal (zoom, download PNG/SVG)
- [ ] QR embedded dalam part detail card
- [ ] "Lihat QR" button di part list

**2C: Label & Batch Print**
- [ ] Label renderer: QR + teks di bawah
- [ ] Label size selector (30×30, 50×50, 100×100)
- [ ] Batch PDF export (multiple labels per A4)
- [ ] "Print Label" button

**2D: Auto-Classification (Basic)**
- [ ] Rules engine dengan builtin rules
- [ ] Classify saat part dibuat/import
- [ ] Confidence badge di form
- [ ] Override category dropdown

### Deliverable

Setiap part punya QR, bisa print label PDF, kategori auto-assign.

---

## Milestone 3: Scanner & Live Transactions (1-2 minggu)

**Goal**: Scan barcode → update stock real-time.

### Tasks

**3A: USB Scanner**
- [ ] Keyboard buffer listener di scan bar
- [ ] Parse QR JSON payload
- [ ] Scan validation (part exists, duplicate check, stock check)
- [ ] Transaction creation (IN/OUT)
- [ ] Stock quantity update
- [ ] Audio feedback (beep sukses/error)
- [ ] Scan history panel (last 10 scans)

**3B: Webcam Scanner**
- [ ] WebRTC camera access
- [ ] ZXing QR decoder integration
- [ ] Camera preview UI (video element)
- [ ] Decode frame dan proses sebagai scan

**3C: Manual Input**
- [ ] Ketik QR ID atau Serial Number
- [ ] Lookup ke DB
- [ ] Proses sebagai scan

**3D: Transaction History View**
- [ ] Tabel semua transaksi
- [ ] Filter: date range, direction, part
- [ ] Sort: timestamp, part name
- [ ] Undo transaksi terakhir (< 5 menit)

### Deliverable

Scan USB scanner → stock update real-time, transaksi tersimpan.

---

## Milestone 4: Grid Dashboard (1 minggu)

**Goal**: Grid monitor visual dengan semua states dan real-time update.

### Tasks

**4A: Grid Core**
- [ ] Grid layout CSS (responsive columns)
- [ ] Part card component dengan semua states (OK/LOW/OUT/REVIEW/NEW)
- [ ] Category icon placeholder
- [ ] Part image support (upload, resize, display)
- [ ] Click → detail modal

**4B: Real-time Update**
- [ ] IPC event `stock-updated` → update card
- [ ] Flash animation saat scan
- [ ] Status badge update otomatis
- [ ] KPI widgets (Total SKU, Items, IN Today, OUT Today)

**4C: Grid Controls**
- [ ] Sort (name, qty, status, date)
- [ ] Filter panel (status, category, MR Invoice)
- [ ] View modes: grid, list, compact
- [ ] Search bar

**4D: Auto-Classification Full**
- [ ] Homogen detection pipeline
- [ ] Fuzzy match + konfirmasi UI
- [ ] Batch preview sebelum generate QR
- [ ] User learning (save override ke custom rules)

### Deliverable

Dashboard grid hidup, sort/filter, scan flash, KPI update.

---

## Milestone 5: Polish & Export (1 minggu)

**Goal**: Excel export, laporan, UX polish, siap produksi.

### Tasks

**5A: Excel Export**
- [ ] Stock Snapshot export (ExcelJS, full styling)
- [ ] Transaction Log export
- [ ] Export dialog dengan filter
- [ ] PDF QR label (finalisasi)

**5B: UX Polish**
- [ ] Keyboard shortcuts (Ctrl+K, Ctrl+N, dll)
- [ ] Context menu (right-click pada card)
- [ ] Empty states (kosong, filter tidak ada hasil)
- [ ] Loading states (import, export, generate)
- [ ] Error messages yang spesifik

**5C: Auto-Backup**
- [ ] Auto-backup database harian
- [ ] Backup location config
- [ ] Backup rotation (keep 30 hari)

**5D: Packaging**
- [ ] Electron Builder config
- [ ] Windows installer (.exe) via NSIS
- [ ] App icon
- [ ] Auto-updater (opsional, bisa skip v1)
- [ ] README user guide

### Deliverable

Aplikasi siap pakai, bisa di-install di PC lain, export Excel berfungsi.

---

## Tech Debt Tracker

| Item | Prioritas | Target Milestone |
|------|-----------|-----------------|
| Unit tests untuk DB repositories | High | M1-M2 |
| Integration tests untuk scan flow | Medium | M3 |
| Classification accuracy improvement | Low | Post-M4 |
| Multi-language support (EN) | Low | v2 |
| Network drive SQLite (multi-user) | Medium | v2 |
| RFID support | Low | v2 |
| REST API untuk integrasi ERP | Low | v2 |

---

## Estimasi Timeline Total

```
M0: Foundation          │ 3–5 hari
M1: Core Data           │ 1 minggu
M2: QR Generation       │ 1 minggu
M3: Scanner & Trans     │ 1–2 minggu
M4: Grid Dashboard      │ 1 minggu
M5: Polish & Export     │ 1 minggu
────────────────────────────────────
Total                   │ 5–7 minggu (solo dev, part-time)
                        │ 2–3 minggu (full-time)
```

---

## Definition of Done

Setiap task dianggap selesai jika:

1. Fitur berjalan tanpa crash di Windows 10/11
2. Tidak ada regression di fitur yang sudah ada
3. UI sesuai design system di `06_ui_design_system.md`
4. Error cases ditangani dengan pesan yang jelas
5. Kode sudah di-commit dengan conventional commit message
6. `progress.md` diupdate dengan status terbaru

---

## Branching Strategy

```
main           ← production-ready code selalu
├── dev        ← integration branch
│   ├── feat/m0-foundation
│   ├── feat/m1-core-data
│   ├── feat/m2-qr-generation
│   └── feat/m3-scanner
```

Commit format:
```
feat(scanner): implement USB HID keyboard buffer
fix(grid): flash animation tidak hilang setelah timeout
docs(workflows): update milestones M2 progress
chore(db): add migration 003 for part images
```
