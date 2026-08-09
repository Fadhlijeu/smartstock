# SAP StockMon
> *Sistem monitoring stock barang berbasis barcode/QR — lokal, cepat, akurat.*

---

## Apa itu SAP StockMon?

SAP StockMon adalah aplikasi **PC desktop** (Electron + Web) untuk monitoring dan manajemen stock barang berbasis **barcode/QR Code**. Setiap barang diidentifikasi dengan barcode unik yang menyimpan data lengkap: tanggal, invoice, purchase order, serial number, quantity, dan deskripsi.

Sistem ini dirancang untuk:
- **Warehouse operator** — scan barang masuk/keluar, lihat status real-time
- **Admin/Manager** — monitor dashboard, export laporan Excel, generate QR batch
- **Part classifier AI** — deteksi otomatis jenis barang dari gambar/metadata

SAP StockMon bukan hanya scanner. Ini adalah **sistem manajemen stock cerdas** dengan visual grid monitoring seperti SAP Business One dashboard, auto-QR generation incremental, dan kemampuan auto-klasifikasi barang.

---

## Dua Prinsip Desain Inti

### 1. Barcode sebagai Sumber Kebenaran
Setiap barang memiliki satu barcode/QR yang menjadi identifier tunggal. Tidak ada duplikasi, tidak ada ambiguitas. Sistem menolak scan duplikat dengan konfirmasi.

### 2. Visual Grid sebagai Monitor
Dashboard utama berbentuk grid cards — setiap kotak mewakili satu SKU/part. Operator bisa melihat status seluruh inventory sekilas tanpa membuka tabel.

---

## Pipeline Sistem

```
Upload Parts (CSV/manual)
    ↓
[Auto-Classification Engine]   ← Deteksi jenis barang dari nama/gambar
    ↓
[QR/Barcode Generator]         ← Auto-generate incremental per part
    ↓
Stock Database (SQLite)        ← Simpan semua transaksi
    ↓
[Scan Barcode]                 ← USB scanner / webcam / manual input
    ↓
[Validation Engine]            ← Cek duplikat, cek quantity, cek anomali
    ↓
Dashboard Grid View            ← Real-time visual monitoring
    ↓
[Export Engine]                ← Excel / PDF laporan
```

---

## Dokumen dalam Folder `workflows/`

| File | Isi |
|------|-----|
| `00_overview.md` | Gambaran besar proyek (file ini) |
| `01_requirements.md` | Kebutuhan fungsional & non-fungsional lengkap |
| `02_architecture.md` | Arsitektur teknis: Electron, backend, database |
| `03_barcode_qr_strategy.md` | Strategi barcode/QR: format, generation, scanning |
| `04_classification_engine.md` | Auto-classification: homogen vs heterogen, AI logic |
| `05_data_models.md` | Skema database SQLite & struktur data |
| `06_ui_design_system.md` | Design system & UI philosophy (Hallmark-aligned) |
| `07_grid_monitor_spec.md` | Spesifikasi grid monitoring visual |
| `08_excel_export_spec.md` | Spesifikasi export Excel & laporan |
| `09_milestones.md` | Roadmap & milestone pengembangan |

---

## Core Feature Set (v1.0)

- **Part Upload** — Upload CSV atau manual entry barang dengan auto-fill fields
- **Auto QR Generation** — Generate QR code incremental per part, batch support
- **Auto Classification** — Deteksi jenis barang dari nama/gambar, handle homogen & heterogen
- **Barcode Scanner** — USB scanner / webcam / manual input dengan validasi
- **Grid Dashboard** — Visual monitoring real-time: kotak per SKU, icon, quantity, status
- **Transaction History** — Log lengkap setiap scan masuk/keluar
- **Excel Export** — Laporan otomatis dengan formatting profesional
- **Part Image** — Setiap part bisa punya gambar untuk identifikasi visual

---

## Batasan Lingkup v1.0 (Tidak Termasuk)

- Cloud sync (by design, lokal-first)
- Multi-user concurrent (bisa di v2)
- ERP integration (SAP/Oracle) — hanya export format
- Mobile app (desktop-only v1)
- RFID support (barcode/QR saja)

---

## Filosofi Desain UI

SAP StockMon menggunakan pendekatan **Hallmark Design** — enterprise tool yang terasa premium, bukan software warehouse yang kaku.

- **Tone**: Utilitarian × Modern-minimal — seperti Linear atau Raycast tapi untuk warehouse
- **Genre**: Modern-minimal (enterprise B2B, data-dense, developer-tool school)
- **Prinsip**: Data adalah fokus. Grid adalah bahasa. Aksi harus cepat (keyboard-first).
- **Inspirasi**: SAP Business One dashboard (layout/grid), Linear (estetika), Raycast (speed)

Lihat `06_ui_design_system.md` untuk detail lengkap.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Desktop Shell | Electron 32 |
| Frontend | HTML + Vanilla CSS + Vanilla JS (ESM) |
| Backend | Node.js (Electron main process) |
| Database | SQLite (better-sqlite3) |
| QR Generation | qrcode.js + node-qrcode |
| Barcode Parsing | @zxing/library |
| Excel Export | ExcelJS |
| PDF Export | jsPDF |
| Icons | Material Symbols Outlined (Google Fonts) |
| Webcam Scanner | WebRTC getUserMedia + ZXing |

---

## Naming Convention

- **Part**: Satu jenis barang unik (identifikasi via barcode)
- **SKU**: Stock Keeping Unit — alias untuk Part dalam konteks inventory
- **Item**: Satu unit fisik dari Part (bisa ada banyak item dari satu part)
- **MR Invoice**: Material Request Invoice — identifikasi perusahaan/supplier
- **Transaction**: Satu event scan masuk atau keluar
- **Batch**: Sekumpulan part yang diproses/di-generate sekaligus
