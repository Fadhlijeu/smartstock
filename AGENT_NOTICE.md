# AGENT_NOTICE.md
## SAP StockMon — Panduan Wajib untuk Setiap Agent

> ⚠️ **BACA INI SEBELUM MENYENTUH SATU PUN FILE DI PROJECT INI.**
> File ini adalah kompas. Jika kamu bingung, baca ulang dari atas.

---

## 🔴 MANDATORY FIRST STEPS (Jangan Skip)

Setiap kali kamu mulai sesi baru di project ini, WAJIB lakukan ini secara berurutan:

```
1. Baca AGENT_NOTICE.md ini sampai selesai (file ini)
2. Baca progress.md → pahami status saat ini + apa yang sudah dikerjakan
3. Baca workflow yang relevan dengan task kamu (lihat tabel di bawah)
4. BARU mulai bekerja
```

**Jangan langsung coding tanpa baca progress.md terlebih dahulu.**

---

## 📌 Project Identity

| Field | Value |
|-------|-------|
| **Nama** | SAP StockMon |
| **Tipe** | Desktop PC app |
| **Platform** | Electron (Windows primary, macOS secondary) |
| **Stack** | Electron + Node.js + HTML + Vanilla CSS + Vanilla JS + SQLite |
| **Repo** | https://github.com/Fadhlijeu/SAP-StockMon (private) |
| **Lokal** | `D:\PROJECT\SAP - Buat tata\` |
| **Tujuan** | Monitoring stock barang via barcode/QR code |

---

## 🗂️ Navigasi Cepat Workflow

Jika kamu sedang mengerjakan ini → baca ini dulu:

| Kamu sedang kerja di... | Baca workflow ini |
|-------------------------|-------------------|
| Database / data schema | [05_data_models.md](workflows/05_data_models.md) |
| QR code / barcode scanning | [03_barcode_qr_strategy.md](workflows/03_barcode_qr_strategy.md) |
| Auto-classification barang | [04_classification_engine.md](workflows/04_classification_engine.md) |
| Arsitektur / module baru | [02_architecture.md](workflows/02_architecture.md) |
| UI / CSS / komponen baru | [06_ui_design_system.md](workflows/06_ui_design_system.md) |
| Grid dashboard / card | [07_grid_monitor_spec.md](workflows/07_grid_monitor_spec.md) |
| Excel export / laporan | [08_excel_export_spec.md](workflows/08_excel_export_spec.md) |
| Milestone / task planning | [09_milestones.md](workflows/09_milestones.md) |
| Overview sistem | [00_overview.md](workflows/00_overview.md) |
| Semua requirements | [01_requirements.md](workflows/01_requirements.md) |

---

## ✅ ATURAN WAJIB (Tidak Boleh Dilanggar)

### 1. Tech Stack Tidak Boleh Diubah Tanpa Izin

```
✅ BOLEH:          Electron, Node.js, HTML, Vanilla CSS, Vanilla JS, SQLite
❌ DILARANG:       React, Vue, Angular, TypeScript, Prisma, MongoDB, dll.
❌ DILARANG:       Framework CSS (Tailwind, Bootstrap, dll.)
```

Jika kamu YAKIN perlu library baru (misal: ExcelJS, pdfkit, node-qrcode) — boleh, tapi:
- Pastikan sesuai dengan yang sudah disebutkan di workflow
- Catat di `progress.md` kenapa library itu dipilih

### 2. Design System Wajib Diikuti

- **Icons**: HANYA Material Symbols Outlined dari Google Fonts. Tidak boleh pakai emoji atau SVG custom untuk UI elements.
- **Colors**: HANYA gunakan CSS custom properties (`--color-*`) yang sudah didefinisikan di `06_ui_design_system.md`. Tidak boleh hardcode hex/rgb/oklch langsung.
- **Font**: Inter (UI) + JetBrains Mono (kode/ID). Tidak boleh font lain.
- **Style**: Tidak ada italic di heading. Tidak ada border-radius > 14px. Status selalu ada teks label, bukan warna saja.

### 3. Database — SQLite Only, Lokal Only

- Database file ada di `data/stockmon.db` (runtime, gitignored)
- Gunakan `better-sqlite3` (synchronous) di main process
- Semua operasi DB via repository pattern di `src/main/db/`
- **Tidak ada network call untuk data** — sistem ini 100% offline

### 4. IPC Pattern Wajib Diikuti

```
Renderer → Main: window.api.methodName()   (via contextBridge)
Main → Renderer: ipcMain.emit('event-name', data)
```

Tidak boleh akses Node.js API langsung dari renderer. Semua harus lewat preload.js.

### 5. Error Handling Wajib Ada

Setiap IPC handler dan DB operation HARUS:
- Punya try-catch
- Return format yang konsisten: `{ success: true, data }` atau `{ success: false, error: { code, message } }`
- Log error ke `logs/error.log`
- Tampilkan pesan error yang spesifik ke user (bukan "Something went wrong")

---

## ⛔ JANGAN LAKUKAN INI

```
❌ Jangan install npm package tanpa cek apakah sudah ada/direncanakan
❌ Jangan ubah SQLite schema tanpa buat migration file baru
❌ Jangan hardcode path file (pakai path.join + app.getPath())
❌ Jangan skip error handling karena "nanti diperbaiki"
❌ Jangan buat UI komponen baru tanpa ikuti design tokens
❌ Jangan commit langsung ke main branch — pakai feat/* branch
❌ Jangan hapus atau timpa workflow files kecuali ada update yang valid
❌ Jangan buat fitur yang tidak ada di requirements (scope creep)
❌ Jangan lupa update progress.md setelah selesai kerja
```

---

## 🔄 Cara Update progress.md

Setelah selesai kerja apapun, tambahkan section baru ke `progress.md`:

```markdown
### SESSION {N} — {YYYY-MM-DD}

**Agent**: [nama agent]
**Task**: [deskripsi singkat]

#### Actions Taken
- ✅ ...
- ✅ ...

#### Files Modified
- `src/...` — apa yang berubah

#### Open Questions / Next Steps
- [ ] ...
```

---

## 🧭 Status Check: Apa yang Sudah Ada?

Lihat `progress.md` untuk status terkini. Tapi secara garis besar:

| Layer | Status |
|-------|--------|
| Workflows documentation | ✅ Selesai (10 files) |
| GitHub repo | ✅ Ada: github.com/Fadhlijeu/SAP-StockMon |
| Electron setup | ❌ Belum dimulai |
| Database / SQLite | ❌ Belum dimulai |
| QR generation | ❌ Belum dimulai |
| Scanner | ❌ Belum dimulai |
| UI / Grid dashboard | ❌ Belum dimulai |
| Excel export | ❌ Belum dimulai |

---

## 🔑 Core Concepts (Hafal Ini)

### QR Payload Format
```json
{
  "v": 1,
  "id": "QR-2026-0001",
  "sn": "BOLT-2026-0001",
  "mr": "INV-2026-1234",
  "po": "PO-2026-5678",
  "qty": 150,
  "cat": "Mechanical/Fastener",
  "ts": 1753084800
}
```

### Status Barang
| Status | Trigger | CSS Token |
|--------|---------|-----------|
| OK | `currentQty > minQty` | `--color-status-ok` |
| LOW | `0 < currentQty ≤ minQty` | `--color-status-low` |
| OUT | `currentQty = 0` | `--color-status-out` |
| REVIEW | `needs_review = 1` | `--color-status-review` |

### 6 Field Data Utama per Barang
```
Date · MR Invoice · Purchase Order · Serial Number · Quantity · Description
```

### Homogen vs Heterogen (Singkat)
- **Homogen**: Nama identik → 1 QR, qty dijumlah
- **Heterogen**: Nama berbeda → QR terpisah per tipe
- **Auto-detect**: 3 layer — exact → fuzzy → category

### Branching
```
main ← production ready
dev  ← integration
feat/m{N}-{slug} ← feature branches
```

### Commit Format
```
feat(module): short description
fix(module): short description
docs(workflows): update X
chore(deps): add exceljs
```

---

## 📞 Jika Kamu Tidak Yakin

1. Cek workflow yang relevan terlebih dahulu
2. Cek `progress.md` untuk konteks historis
3. Jika masih tidak yakin → **tanya user, jangan asumsikan**
4. Jangan buat keputusan arsitektur besar tanpa konfirmasi

> **Prinsip**: "Better to ask once than to rebuild twice."

---

*File ini diupdate setiap ada perubahan arsitektur besar.*
*Terakhir diupdate: 2026-08-09 — Session 001*
