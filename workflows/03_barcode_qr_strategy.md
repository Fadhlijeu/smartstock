# 03 — Barcode & QR Strategy
## SAP StockMon · Strategi Barcode, QR Code, dan Scanning

---

## Overview

SAP StockMon menggunakan **QR Code sebagai identifier utama**, dengan fallback ke barcode 1D (Code128) untuk kompatibilitas dengan scanner lama. Setiap part memiliki **satu QR unik** yang berisi payload JSON terenkripsi sederhana.

---

## Format QR Code

### Payload JSON (v1)

```json
{
  "v": 1,
  "id": "QR-2026-0001",
  "sn": "BOLT-2026-0001",
  "sku": "MECH-FAST-M6",
  "mr": "INV-2026-1234",
  "po": "PO-2026-5678",
  "qty": 150,
  "cat": "Mechanical/Fastener",
  "ts": 1753084800
}
```

| Field | Type | Keterangan |
|-------|------|------------|
| `v` | int | Version payload, untuk backward compat |
| `id` | string | QR unique ID (auto-incremental) |
| `sn` | string | Serial Number barang |
| `sku` | string | Stock Keeping Unit internal |
| `mr` | string | MR Invoice (nomor company) |
| `po` | string | Purchase Order number |
| `qty` | int | Quantity saat QR dibuat |
| `cat` | string | Category path (auto-classified) |
| `ts` | int | Unix timestamp saat QR dibuat |

### Format QR ID (Incremental)

```
QR-{YYYY}-{SEQ4}
QR-2026-0001  ← Pertama di tahun 2026
QR-2026-0002
...
QR-2026-9999  ← Max 9999 per tahun
QR-2026-10000 ← Jika lebih dari 9999, padding tambah
```

**Implementation:**
```javascript
// sequence.manager.js
class QRSequenceManager {
  constructor(db) {
    this.db = db;
    this.year = new Date().getFullYear();
  }

  nextId() {
    const row = this.db.prepare(
      `SELECT MAX(CAST(SUBSTR(qr_id, 9) AS INTEGER)) as max_seq
       FROM parts WHERE qr_id LIKE 'QR-${this.year}-%'`
    ).get();
    
    const nextSeq = (row?.max_seq ?? 0) + 1;
    const padded = String(nextSeq).padStart(4, '0');
    return `QR-${this.year}-${padded}`;
  }
}
```

---

## Serial Number Strategy

### Auto-Generate Format

```
{PREFIX}-{YYYY}-{SEQ4}
```

Prefix ditentukan dari kategori:
| Kategori | Prefix |
|----------|--------|
| Mechanical/Fastener | `FAST` |
| Mechanical/Bearing | `BEAR` |
| Electrical/Cable | `CABL` |
| Electrical/Component | `ELEC` |
| Consumable | `CONS` |
| Uncategorized | `ITEM` |
| Custom (user define) | `{USER}` |

Contoh: `FAST-2026-0001`, `BEAR-2026-0042`

### Manual Override Rules

- User bisa input serial number custom
- Jika serial sudah ada di DB → reject + tampilkan serial yang konflik
- Jika serial valid → simpan, tandai `sn_source = 'manual'`
- Serial manual tidak ikut counter auto-generate

---

## QR Generation Pipeline

### Single QR

```javascript
// qr.generator.js
async function generateQR(part) {
  // 1. Build payload
  const payload = buildPayload(part);
  
  // 2. Convert to JSON string (compact)
  const jsonStr = JSON.stringify(payload);
  
  // 3. Generate QR dengan node-qrcode
  const qrPng = await QRCode.toBuffer(jsonStr, {
    errorCorrectionLevel: 'M',  // 15% recovery
    type: 'png',
    quality: 0.95,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 400  // 400x400 pixels
  });
  
  // 4. Generate label (QR + teks)
  const label = await renderLabel(qrPng, part);
  
  return {
    qrRaw: qrPng,       // QR only (400x400 PNG)
    label: label,        // Full label dengan teks
    payload: payload
  };
}
```

### Batch QR (PDF Layout)

```
A4 Sheet Layout (dengan margin 10mm):
┌──────────────────────────────────┐
│  [Label 1]  [Label 2]  [Label 3] │
│  [Label 4]  [Label 5]  [Label 6] │
│  [Label 7]  [Label 8]  [Label 9] │
│  [Label 10] [Label 11] [Label 12]│
└──────────────────────────────────┘
12 labels per A4 (50x50mm size)
```

Label sizes yang tersedia:
| Size | Labels/A4 | Cocok untuk |
|------|-----------|------------|
| 30×30mm | 25 | Barang kecil, box |
| 50×50mm | 12 | Standard, most use cases |
| 100×100mm | 4 | Barang besar, pallet |
| Custom | user-defined | — |

---

## Scanning Architecture

### 1. USB HID Scanner (Primary)

USB barcode scanner mengemulasi keyboard. Setiap karakter QR dikirim sebagai keystroke, diakhiri dengan `\n` (Enter).

```javascript
// hid.listener.js (main process)
class HIDScannerListener {
  constructor() {
    this.buffer = '';
    this.timeout = null;
    this.TIMEOUT_MS = 100; // Clear buffer jika tidak ada input 100ms
  }

  // Attach ke global keyboard listener di main process
  start() {
    // Electron: gunakan globalShortcut atau iohook
    // Input diteruskan ke renderer via IPC hanya jika scanner mode aktif
    
    app.on('browser-window-focus', (event, win) => {
      // Inject keyboard listener script ke renderer
      win.webContents.executeJavaScript(`
        document.addEventListener('keydown', window.__scanBufferHandler);
      `);
    });
  }
}
```

**Di Renderer (scan-bar.js):**
```javascript
// Scan bar selalu focused saat scanner mode aktif
// Semua keyboard input masuk ke invisible input field
class ScanBar {
  constructor() {
    this.input = document.getElementById('scan-input');
    this.buffer = '';
    this.timer = null;
  }

  activate() {
    this.input.focus();
    this.input.addEventListener('input', this.handleInput.bind(this));
    this.input.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleInput(e) {
    this.buffer += e.data || '';
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.processBuffer(), 80);
  }

  handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.processBuffer();
    }
  }

  async processBuffer() {
    const raw = this.buffer.trim();
    this.buffer = '';
    this.input.value = '';
    
    if (!raw) return;
    
    try {
      const payload = JSON.parse(raw);
      await this.processScan(payload);
    } catch {
      // Bukan JSON → coba sebagai plain ID
      await this.processScan({ id: raw });
    }
  }
}
```

### 2. Webcam Scanner (Secondary)

```javascript
// webcam.scanner.js (renderer process)
import { BrowserQRCodeReader } from '@zxing/library';

class WebcamScanner {
  constructor() {
    this.reader = new BrowserQRCodeReader();
    this.stream = null;
    this.active = false;
  }

  async start(videoElement) {
    const devices = await this.reader.listVideoInputDevices();
    // Pilih kamera belakang/eksternal jika ada
    const deviceId = devices.find(d => 
      d.label.toLowerCase().includes('usb') || 
      d.label.toLowerCase().includes('back')
    )?.deviceId || devices[0]?.deviceId;
    
    this.active = true;
    this.reader.decodeFromVideoDevice(deviceId, videoElement, (result, error) => {
      if (result && this.active) {
        this.onScan(result.getText());
      }
    });
  }

  onScan(raw) {
    // Sama dengan HID: parse JSON, proses scan
  }

  stop() {
    this.active = false;
    this.reader.reset();
  }
}
```

### 3. Manual Input (Fallback)

Input manual via text field:
- User ketik QR ID atau Serial Number
- Press Enter → system lookup ke DB
- Jika ada → proses sebagai scan
- Jika tidak ada → error "Part tidak ditemukan"

---

## Scan Validation Rules

```javascript
// scan.validator.js
async function validateScan(payload, direction) {
  const errors = [];
  const warnings = [];
  
  // Rule 1: Part harus ada di DB
  const part = await db.parts.findByQRId(payload.id);
  if (!part) {
    errors.push({ code: 'PART_NOT_FOUND', message: `Part ${payload.id} tidak ada di database` });
    return { valid: false, errors };
  }
  
  // Rule 2: QR version compatibility
  if (payload.v > CURRENT_QR_VERSION) {
    warnings.push({ code: 'QR_VERSION_NEWER', message: 'QR ini dari versi app yang lebih baru' });
  }
  
  // Rule 3: Duplicate scan prevention (60 second window)
  const recentScan = await db.transactions.findRecent(part.id, 60);
  if (recentScan && recentScan.direction === direction) {
    warnings.push({
      code: 'DUPLICATE_SCAN',
      message: `Part ini baru di-scan ${direction} ${recentScan.secondsAgo}s yang lalu`,
      requireConfirmation: true
    });
  }
  
  // Rule 4: Stock tidak boleh negatif (untuk OUT)
  if (direction === 'OUT' && part.currentQty <= 0) {
    errors.push({ code: 'STOCK_EMPTY', message: 'Stock sudah 0, tidak bisa OUT' });
  }
  
  return {
    valid: errors.length === 0,
    requireConfirmation: warnings.some(w => w.requireConfirmation),
    part,
    errors,
    warnings
  };
}
```

---

## Scan States & UX

```
State: IDLE
  UI: Input field abu-abu, label "Scanner siap"
  
State: LISTENING
  UI: Input field highlighted biru, label "Scan barcode..." (pulsing)
  
State: PROCESSING (< 200ms)
  UI: Spinner kecil di scan bar
  
State: SUCCESS
  UI: Flash hijau, beep sukses, update grid card
  Toast: "✓ [Nama Part] — IN/OUT berhasil"
  
State: WARNING (duplicate, dll)
  UI: Flash kuning
  Dialog: Konfirmasi lanjutkan?
  
State: ERROR
  UI: Flash merah, beep error
  Toast: "✗ Error: [pesan error]"
  
State: WEBCAM_ACTIVE
  UI: Video feed tampil, kotak target di tengah
```

---

## QR Code Persistence

Setiap QR yang digenerate disimpan:
- `data/qr-cache/{qr_id}.png` — file fisik QR
- DB: `parts.qr_generated_at`, `parts.qr_payload_hash`

Jika data part berubah (quantity, deskripsi, dll):
- Hash QR payload berubah → regenerate otomatis
- QR lama masih valid untuk lookup (by ID), tapi ditandai `outdated`
- Printer ulang label jika diperlukan

---

## Backward Compatibility

Versi payload QR dihandle dengan strategy:

```javascript
function parseQRPayload(raw) {
  const obj = JSON.parse(raw);
  
  switch(obj.v) {
    case 1: return parseV1(obj);
    case 2: return parseV2(obj);  // future
    default:
      // Coba sebagai plain serial number (legacy pre-QR era)
      return { id: null, sn: raw, legacy: true };
  }
}
```
