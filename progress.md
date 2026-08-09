# SAP StockMon — Progress Log

> File ini adalah **memory permanen** dari seluruh proses pembangunan SAP StockMon.
> Setiap agent/session yang bekerja di project ini WAJIB membaca file ini di awal
> dan WAJIB mengupdate file ini setelah selesai.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Project Name** | SAP StockMon |
| **Platform** | PC Desktop (Electron) |
| **Stack** | Electron + Node.js + HTML/CSS/JS + SQLite |
| **Repository** | GitHub (private) — `SAP - Buat tata` |
| **Started** | 2026-08-09 |
| **Target** | Aplikasi monitoring stock barang via barcode/QR |

---

## Quick Status

```
M0: Foundation    [ ] Not started
M1: Core Data     [ ] Not started
M2: QR Generation [ ] Not started
M3: Scanner       [ ] Not started
M4: Grid Monitor  [ ] Not started
M5: Polish/Export [ ] Not started
```

---

## Session Log

---

### SESSION 001 — 2026-08-09

**Agent**: Antigravity (Google DeepMind)
**Duration**: ~1 jam
**Task**: Initial planning & workflow documentation

#### User Request (Original)

```
saya ingin membuat software pc SAP untuk monitoring stock barang, sistemnya menggunakan 
barcode sebagai identifier setiap barang, jadi sistemnya saya upload setiap barang yang 
mempunyai barcode, setiap barcode ada data barang: Date, MR Invoice (company), Purchase 
Order, Serial Number, Quantity, Description.

barang terscan akan tersimpan ke database dan excel untuk laporan (export)

lalu ada monitor tiap barang seperti gambar yang saya upload ada bentuk grid, setiap kotak 
mewakili data, saya juga pengen ada misalnya gambar parts, ketika barang masuk barang tsb 
akan membentuk kotak baru, ada icon barang, ada jumlah, dll.

masalahnya saya tidak tahu aplikasi SAP memiliki komponen apa saja dan kebutuhan apa saja, 
program design dll. oleh sebab itu saya mau kamu buatkan folder workflows/ berisikan file 
file markdown terkait planning, architecture, design, etc seperti D:PROJECT/Peak - Gallery/workflows

buat sebagus dan sematang mungkin

saya juga mau ada auto qr generate, saya upload beberapa parts, lalu auto generate qr secara 
incremental namun saya juga ingin ada auto detection part, misalnya saya upload part yang 
bukan sejenis maka biarkan backend yang mengatur itu barang apa, lalu karena ada beberapa 
data yang harus diisi, formnya ada yang manual dan ada yang otomatis, tapi saya juga bingung 
dengan barang homogen dan heterogen, coba design yang bagus ke workflows ya.

lalu karena ini aplikasi yang bisa dibilang dummy, kita pakai icon dari material symbol google.

harus bisa handle semua masalah.

silahkan lihat project peak - gallery untuk format workflows dan UI/UX yang tidak ai slop 
bisa di cek ke /skills-router /hallmark atau workflows peak gallery

Software PC

buat github private dan commit setiap proses, dan buat 1 file markdown (progress.md) 
supaya bisa share ke agent lain dan menyimpan alur dari awal hingga akhir, prompt, 
response, thinking, action, etc di store ke dalam tanpa pengecualian apapun.
```

#### Agent Thinking & Analysis

**Problem Decomposition:**
1. User butuh aplikasi desktop untuk warehouse/stock management
2. Sistem identifier = barcode + QR code
3. Data per item: Date, MR Invoice, PO, Serial, Qty, Description
4. Fitur utama: scan, simpan DB, export Excel, visual grid monitor
5. Extra: Auto QR generate incremental, auto-classify barang, handle homogen/heterogen
6. Icon: Material Symbols Google
7. Platform: PC (Electron pilihan terbaik untuk desktop cross-platform dengan web tech)
8. Format workflows: ikuti Peak Gallery (00_overview, 01_requirements, dst.)
9. Hallmark design principles untuk UI yang tidak AI-slop

**Key Design Decisions:**
- **Electron**: Karena full-stack JavaScript, SQLite mudah via better-sqlite3, UI via HTML/CSS/JS
- **Vanilla JS + CSS**: Sesuai kebutuhan Hallmark — tidak pakai framework berat
- **SQLite**: Lokal-first, tidak perlu server, perfect untuk single workstation
- **Rule-based classification**: Tidak pakai ML (terlalu berat untuk offline desktop), pakai keyword rules JSON yang bisa di-extend user
- **Homogen detection**: Tiga layer — exact match, fuzzy similarity, category-based
- **QR format**: JSON payload dengan versioning untuk backward compatibility
- **Grid dashboard**: Real-time update via IPC events, card-based dengan status color coding

#### Actions Taken

1. ✅ Membaca `skills-router` skill
2. ✅ Membaca `hallmark` skill (full 559 lines)
3. ✅ Explore Peak Gallery project structure dan semua 9 workflows files
4. ✅ Check existing SAP project directory (kosong)
5. ✅ `git init` di `D:\PROJECT\SAP - Buat tata`
6. ✅ Membuat `workflows/00_overview.md` — gambaran sistem lengkap
7. ✅ Membuat `workflows/01_requirements.md` — 70+ requirements dengan prioritas
8. ✅ Membuat `workflows/02_architecture.md` — Electron architecture, semua modul
9. ✅ Membuat `workflows/03_barcode_qr_strategy.md` — QR format, payload, scanning
10. ✅ Membuat `workflows/04_classification_engine.md` — homogen/heterogen algorithm
11. ✅ Membuat `workflows/05_data_models.md` — SQLite schema lengkap + TypeDef
12. ✅ Membuat `workflows/06_ui_design_system.md` — Hallmark-aligned design system
13. ✅ Membuat `workflows/07_grid_monitor_spec.md` — grid card anatomy & states
14. ✅ Membuat `workflows/08_excel_export_spec.md` — ExcelJS template + PDF labels
15. ✅ Membuat `workflows/09_milestones.md` — 5 milestones, 5-7 minggu timeline
16. ✅ Membuat `progress.md` (file ini)
17. ⏳ GitHub repo create (menunggu eksekusi)
18. ⏳ Initial commit (menunggu eksekusi)

#### Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Electron over native | Cross-platform, web tech familiar, SQLite access mudah, UI fleksibel |
| Vanilla JS over React/Vue | Sesuai spec (no framework), lebih ringan, Hallmark recommends |
| Rule-based classification | Offline, deterministik, user bisa edit rules JSON, tidak butuh GPU |
| SQLite over JSON files | Transactional, indexable, query-able, backup mudah |
| QR JSON payload | Lebih kaya informasi dari plain barcode, backward compatible via `v` field |
| better-sqlite3 vs node-sqlite3 | Synchronous API, lebih simple di main process, performa lebih baik |
| ExcelJS over xlsx-js | Bisa styling cell, stream output, aktif maintained |
| Levenshtein similarity | Simple, proven, tidak butuh dependency eksternal |

#### Files Created This Session

```
D:\PROJECT\SAP - Buat tata\
├── workflows/
│   ├── 00_overview.md          ← System overview & pipeline
│   ├── 01_requirements.md      ← 70+ functional & non-functional requirements
│   ├── 02_architecture.md      ← Full Electron architecture with all modules
│   ├── 03_barcode_qr_strategy.md ← QR payload format, generation, scanning
│   ├── 04_classification_engine.md ← Homogen/heterogen detection algorithm
│   ├── 05_data_models.md       ← SQLite schema + JS typedefs + CSV template
│   ├── 06_ui_design_system.md  ← Hallmark-aligned design tokens & components
│   ├── 07_grid_monitor_spec.md ← Card anatomy, states, interactions
│   ├── 08_excel_export_spec.md ← ExcelJS templates + QR label PDF
│   └── 09_milestones.md        ← 5 milestones roadmap
└── progress.md                 ← This file
```

#### Open Questions / Next Steps

- [ ] **GitHub repo**: Perlu create private repo dan push
- [ ] **Initial commit**: Commit semua workflows + progress.md
- [ ] **M0 dimulai?**: Tanyakan user apakah mau langsung lanjut ke implementasi
- [ ] **App name confirmation**: "SAP StockMon" atau nama lain?
- [ ] **Operator login?**: Apakah perlu user authentication atau single-user saja?
- [ ] **Network**: Apakah perlu akses dari beberapa PC (shared SQLite)?
- [ ] **Min qty alert**: Notifikasi system (tray) atau hanya visual di app?

---

## Architecture Reference (Quick)

```
Electron Main Process (Node.js)
├── Database (better-sqlite3 / SQLite)
├── QR Generator (node-qrcode)
├── Scanner Handler (USB HID + WebRTC)
├── Classification Engine (rule-based)
├── CSV Parser
└── Excel/PDF Exporter (ExcelJS + pdfkit)

Renderer Process (HTML/CSS/JS)
├── Dashboard Grid
├── Part Management Forms
├── Scanner View
├── Transaction History
└── Reports & Export
```

## Key QR Payload

```json
{"v":1,"id":"QR-2026-0001","sn":"BOLT-2026-0001","sku":"MECH-FAST-M6",
 "mr":"INV-2026-1234","po":"PO-2026-5678","qty":150,"cat":"Mechanical/Fastener","ts":1753084800}
```

## Color Status Reference

| Status | Color Token | Trigger |
|--------|-------------|---------|
| OK | `--color-status-ok` (green) | qty > minQty |
| LOW | `--color-status-low` (amber) | 0 < qty ≤ minQty |
| OUT | `--color-status-out` (red) | qty = 0 |
| REVIEW | `--color-status-review` (orange) | needs_review = 1 |

---

*Last updated: 2026-08-09 by Antigravity (Session 001)*
