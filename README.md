# SAP StockMon

> Software monitoring stock barang berbasis barcode/QR — lokal, cepat, akurat.

Aplikasi desktop PC untuk manajemen dan monitoring inventory berbasis barcode/QR code.

## Tech Stack

- **Shell**: Electron
- **Frontend**: HTML + Vanilla CSS + Vanilla JS
- **Backend**: Node.js (Electron main process)  
- **Database**: SQLite (better-sqlite3)
- **Icons**: Material Symbols Outlined (Google Fonts)

## Documentation

Semua planning dan arsitektur ada di folder `workflows/`:

| File | Isi |
|------|-----|
| `workflows/00_overview.md` | Gambaran besar sistem |
| `workflows/01_requirements.md` | Requirements lengkap |
| `workflows/02_architecture.md` | Arsitektur Electron |
| `workflows/03_barcode_qr_strategy.md` | Strategi QR/barcode |
| `workflows/04_classification_engine.md` | Auto-classification engine |
| `workflows/05_data_models.md` | Database schema |
| `workflows/06_ui_design_system.md` | Design system |
| `workflows/07_grid_monitor_spec.md` | Grid monitor spec |
| `workflows/08_excel_export_spec.md` | Excel export spec |
| `workflows/09_milestones.md` | Roadmap & milestones |

## Progress

Lihat `progress.md` untuk log lengkap proses pembangunan.

## Core Features

- **Upload Parts** — CSV import atau manual entry
- **Auto QR Generation** — Incremental QR codes per part
- **Auto Classification** — Deteksi otomatis kategori barang (homogen/heterogen)
- **Barcode Scanner** — USB scanner, webcam, atau manual input
- **Grid Dashboard** — Visual monitoring real-time dengan status OK/LOW/OUT
- **Excel Export** — Laporan stock snapshot dan transaction log
