# 01 — Requirements
## SAP StockMon · Spesifikasi Kebutuhan Lengkap

---

## 1. Kebutuhan Fungsional

### 1.1 Part Management (Upload & Entry)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-01 | User bisa upload CSV berisi daftar parts sekaligus (bulk import) | P0 |
| F-02 | User bisa input part secara manual satu per satu via form | P0 |
| F-03 | Setiap part wajib memiliki field: Date, MR Invoice, Purchase Order, Serial Number, Quantity, Description | P0 |
| F-04 | System auto-generate field jika memungkinkan (Serial Number incremental, Date = today) | P1 |
| F-05 | User bisa attach gambar/foto untuk setiap part | P1 |
| F-06 | Edit dan hapus part yang sudah diinput (dengan konfirmasi) | P0 |
| F-07 | Bulk edit: ubah field tertentu untuk multiple parts sekaligus | P2 |
| F-08 | Duplicate detection: cegah part dengan Serial Number identik | P0 |
| F-09 | Import CSV dengan template yang bisa didownload | P1 |
| F-10 | Validasi field saat input: format tanggal, angka quantity, string required | P0 |

### 1.2 Auto Classification Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| F-20 | System bisa mendeteksi jenis/kategori barang dari nama/description secara otomatis | P0 |
| F-21 | Klasifikasi barang **homogen**: barang sejenis dalam satu batch → auto-group | P0 |
| F-22 | Klasifikasi barang **heterogen**: barang berbeda jenis dalam upload → auto-categorize setiap item | P0 |
| F-23 | User bisa override klasifikasi otomatis dengan pilihan manual | P0 |
| F-24 | System belajar dari koreksi user (rule-based learning, bukan ML) | P2 |
| F-25 | Klasifikasi berdasarkan: nama part, prefix Serial Number, kategori MR Invoice | P1 |
| F-26 | Confidence score ditampilkan untuk setiap auto-classification | P1 |
| F-27 | Barang baru yang tidak dikenal → masuk kategori "Uncategorized" dengan flag untuk review | P0 |
| F-28 | Category tree: kategori utama → sub-kategori (maksimal 3 level) | P1 |

### 1.3 QR / Barcode Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| F-30 | Auto-generate QR code untuk setiap part yang diinput | P0 |
| F-31 | QR generation incremental: Part A → QR-001, Part B → QR-002, dst. | P0 |
| F-32 | Format QR code: embed JSON payload {id, serial, sku, mrInvoice, po, qty} | P0 |
| F-33 | QR code bisa di-download (PNG, SVG) | P0 |
| F-34 | Batch print: generate lembar QR untuk 1 batch sekaligus (PDF ready-print) | P1 |
| F-35 | QR label size configurable: 30x30mm, 50x50mm, 100x100mm | P1 |
| F-36 | QR label bisa include: nama part, serial number, quantity (human-readable di bawah QR) | P0 |
| F-37 | Support barcode 1D juga: Code128, Code39 (opsional, fallback) | P2 |
| F-38 | Re-generate QR jika data part berubah, invalidate QR lama | P1 |
| F-39 | QR code memiliki error correction level: M (15%) default, H (30%) untuk kondisi kotor | P1 |

### 1.4 Scanning & Intake

| ID | Requirement | Priority |
|----|-------------|----------|
| F-40 | Support input dari USB barcode scanner (HID keyboard emulation) | P0 |
| F-41 | Support scanning via webcam (browser WebRTC + ZXing) | P1 |
| F-42 | Support input manual: ketik barcode ID di search box | P0 |
| F-43 | Scan event → langsung update database + dashboard real-time | P0 |
| F-44 | Duplicate scan detection: jika barang sudah pernah scan masuk dan scan lagi → warning | P0 |
| F-45 | Scan direction: masuk (IN) vs keluar (OUT) — toggle sebelum scan | P0 |
| F-46 | Bulk scan mode: scan banyak barang berturut-turut tanpa klik konfirmasi | P1 |
| F-47 | Audit trail: setiap scan tersimpan dengan timestamp, operator (jika ada user login), arah (IN/OUT) | P0 |
| F-48 | Sound feedback: beep sukses vs beep error | P1 |
| F-49 | Scan history panel: 10 scan terakhir terlihat di sidebar | P1 |

### 1.5 Dashboard Grid Monitor

| ID | Requirement | Priority |
|----|-------------|----------|
| F-50 | Dashboard utama berbentuk grid cards, setiap card = 1 SKU/part | P0 |
| F-51 | Card menampilkan: icon/gambar part, nama part, quantity saat ini, status (OK/Low/Out) | P0 |
| F-52 | Card color-coded berdasarkan stock level: hijau (OK), kuning (Low), merah (Out) | P0 |
| F-53 | Barang baru masuk → card baru muncul otomatis di grid | P0 |
| F-54 | Grid bisa di-sort: by name, by quantity, by date added, by status | P1 |
| F-55 | Grid bisa di-filter: by category, by status, by MR Invoice | P1 |
| F-56 | Card click → detail modal: semua field data + transaksi history | P0 |
| F-57 | Grid bisa switch antara: grid view (card), list view (tabel), compact view | P1 |
| F-58 | Search bar di dashboard: cari part by name, serial, MR Invoice | P0 |
| F-59 | KPI summary di atas grid: Total SKU, Total Items, In Today, Out Today | P0 |

### 1.6 Transaction & History

| ID | Requirement | Priority |
|----|-------------|----------|
| F-60 | Setiap scan masuk/keluar dicatat sebagai transaction | P0 |
| F-61 | Transaction record: timestamp, part_id, direction (IN/OUT), quantity, note, operator | P0 |
| F-62 | Transaction history view: tabel semua transaksi, sortable, filterable | P0 |
| F-63 | Undo transaksi terakhir (dalam 5 menit, dengan konfirmasi) | P1 |
| F-64 | Export transaksi ke Excel | P0 |

### 1.7 Excel Export & Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| F-70 | Export stock snapshot: kondisi saat ini semua barang ke Excel | P0 |
| F-71 | Export transaction log: semua transaksi dalam range tanggal ke Excel | P0 |
| F-72 | Excel output berformat rapi: header, banding rows, summary row | P0 |
| F-73 | Export filter: by date range, by category, by MR Invoice | P1 |
| F-74 | Auto-nama file: StockReport_YYYYMMDD.xlsx | P0 |
| F-75 | Export PDF: versi print-friendly dari stock snapshot | P2 |

---

## 2. Kebutuhan Non-Fungsional

### 2.1 Performance

| Metric | Target |
|--------|--------|
| App launch time | < 3 detik (cold start) |
| QR generation (single) | < 100ms |
| QR batch generation (100 items) | < 5 detik |
| Scan response time | < 200ms (dari scan ke update dashboard) |
| Dashboard render (500 cards) | 60 fps scroll |
| Database query (stock status) | < 50ms |
| Excel export (1000 rows) | < 3 detik |

### 2.2 Reliability

- Semua data tersimpan ke SQLite lokal — tidak ada dependency internet
- Auto-backup database setiap hari ke folder yang bisa dikonfigurasi
- Crash recovery: rollback transaksi yang partial jika aplikasi crash
- Corrupt detection: validasi integrity database saat startup

### 2.3 Usability

- Keyboard-first: semua aksi utama bisa via keyboard shortcut
- Scan box selalu focused saat scanner mode aktif
- Clear visual feedback untuk setiap aksi
- Error message yang spesifik, bukan generic "Error occurred"

### 2.4 Kompatibilitas

- **Platform**: Windows 10/11 (64-bit) — primary target
- **macOS**: 12+ (secondary, same codebase via Electron)
- **Screen resolution**: minimum 1280×720
- **USB Scanner**: semua HID keyboard-emulation barcode scanner

### 2.5 Security (Konteks Lokal)

- Database tidak ter-expose ke network
- Tidak ada data yang keluar dari mesin lokal
- Optional: password protect database (v2)

---

## 3. Edge Cases & Constraint

### 3.1 Homogen vs Heterogen

**Barang Homogen**: Satu batch upload berisi 50 unit part yang SAMA (misal: 50 baut M6)
- → Auto-detect: nama sama, deskripsi mirip
- → Generate 1 QR per tipe (bukan 50 QR)
- → Quantity di QR = 50

**Barang Heterogen**: Satu batch upload berisi part yang BERBEDA-BEDA (misal: baut + mur + ring)
- → Auto-detect: nama berbeda, deskripsi berbeda
- → Generate 1 QR per TIPE (3 QR dalam kasus ini)
- → Quantity masing-masing QR = quantity part itu

**Mixed Batch**: Campur antara homogen dan heterogen
- → System harus handle per-line CSV
- → Group barang dengan nama/serial prefix yang sama → 1 QR
- → Barang unik → QR sendiri

### 3.2 Serial Number Strategy

- **Auto-generate**: Format `{PREFIX}-{YYYY}-{SEQ4}` contoh: `BOLT-2026-0001`
- **Manual entry**: User bisa override dengan serial sendiri
- **Conflict resolution**: Jika serial duplikat → sistem menolak + suggestion serial baru

### 3.3 Constraints

- Aplikasi dirancang untuk satu operator / single workstation
- Multi-user bisa dicapai via shared SQLite file di network drive (v2, read tabel lock)
- Ukuran database diasumsikan < 10GB (100.000+ transaksi)
