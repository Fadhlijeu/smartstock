# 07 — Grid Monitor Specification
## SAP StockMon · Spesifikasi Visual Grid Monitoring

---

## Filosofi Grid

Grid adalah **jantung dari SAP StockMon**. Seperti trading floor monitor atau server status board — operator harus bisa **membaca status 500 parts dalam 5 detik** tanpa membuka apapun.

**3 Prinsip Grid:**
1. **Scannable**: Status terlihat dari jauh (warna + ikon, bukan teks saja)
2. **Actionable**: Klik 1× ke detail, klik 2× (atau Enter) langsung ke aksi
3. **Live**: Update real-time tanpa refresh

---

## Card Anatomy

### Ukuran: Medium (Default)

```
╔══════════════════════════════════╗  ← border 1px, radius 10px
║  [120×80px image area]     ● OK ║  ← image + status badge (top-right)
║                                  ║
║  Baut M6 Stainless SS            ║  ← name, weight 600, text-md
║  Mechanical · Fastener           ║  ← category (secondary color, text-xs)
║                                  ║
║  ────────────────────────────── ║  ← divider (--color-paper-border)
║                                  ║
║  150 pcs              QR-0001   ║  ← qty (bold, text-lg) + QR ID (mono, muted)
╚══════════════════════════════════╝

Width: 220px min, flex 1
Height: auto (~180px)
```

### Ukuran: Small (Compact Mode)

```
╔═══════════════════╗
║  [48×48] ● OK    ║  ← kecil, hanya icon
║  Baut M6          ║
║  150 pcs          ║
╚═══════════════════╝

Width: 160px min
Height: ~120px
```

### Ukuran: Large (2-Column View)

```
╔═══════════════════════════════════════════════════╗
║  [160×160px image]                         ● OK  ║
║                                                   ║
║  Baut M6 Stainless Steel Grade A 316             ║  ← full name
║  Mechanical / Fastener  •  SN: FAST-2026-0001    ║
║  MR Invoice: INV-2026-1234  •  PO: PO-2026-5678  ║
║                                                   ║
║  ─────────────────────────────────────────────── ║
║                                                   ║
║  Current Stock: 150 pcs        QR: QR-2026-0001  ║
║  Initial: 200 pcs  │  Min: 10 pcs                ║
║                                                   ║
║  [qr_code_2 QR]  [print Label]  [edit Edit]      ║
╚═══════════════════════════════════════════════════╝
```

---

## Card States

### State: OK (Stock Normal)

```css
.part-card--ok {
    /* Default styling, no special border */
    --card-status-color: var(--color-status-ok);
    --card-status-bg: var(--color-status-ok-dim);
}
```

```
╔════════════════════════════╗
║  [img]            ● OK    ║  ← green badge
║  Baut M6                   ║
║  ─────────────────────── ║
║  150 pcs         QR-0001  ║
╚════════════════════════════╝
```

### State: LOW (Stock Rendah)

```css
.part-card--low {
    border-left: 3px solid var(--color-status-low);
    --card-status-color: var(--color-status-low);
    --card-status-bg: var(--color-status-low-dim);
}
```

```
║╔═══════════════════════════╗
║║  [img]           ⚠ LOW   ║  ← amber badge + left border
║║  Bearing 6205             ║
║║  ─────────────────────── ║
║║  2 pcs           QR-0042  ║  ← qty kecil = warning
╚╚═══════════════════════════╝
```

### State: OUT (Stock Habis)

```css
.part-card--out {
    border-left: 3px solid var(--color-status-out);
    --card-status-color: var(--color-status-out);
    --card-status-bg: var(--color-status-out-dim);
    opacity: 0.85;  /* sedikit redup, masih visible */
}
```

```
║╔═══════════════════════════╗
║║  [img]            ✕ OUT  ║  ← red badge + left border
║║  Seal O-Ring              ║
║║  ─────────────────────── ║
║║  0 pcs           QR-0088  ║  ← qty = 0
╚╚═══════════════════════════╝
```

### State: NEEDS REVIEW

```css
.part-card--review {
    border: 1px dashed var(--color-status-review);
    --card-status-color: var(--color-status-review);
}
```

```
╔ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╗  ← dashed border (amber)
   [img]          ⚠ REVIEW   
   Unknown Part XR-450        
   Uncategorized              
   ─────────────────────── 
   5 pcs            QR-0113  
╚ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╝
```

### State: NEW (Baru Masuk, < 24 jam)

```css
.part-card--new::before {
    content: 'NEW';
    /* Pill badge di top-left corner */
    background: var(--color-accent);
    color: var(--color-ink-inverse);
    font-size: var(--text-2xs);
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 4px;
    position: absolute;
    top: var(--space-2);
    left: var(--space-2);
}
```

### State: HOVER / FOCUS

```css
.part-card:hover {
    background: var(--color-paper-2);
    border-color: var(--color-accent-dim);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px oklch(0% 0 0 / 0.3);
}

.part-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-color: var(--color-focus);
}
```

### State: SCAN FLASH

Ketika part ini di-scan:

```css
/* Flash sukses */
@keyframes scanFlashSuccess {
    0%   { background: var(--color-paper-1); }
    20%  { background: var(--color-status-ok-dim); border-color: var(--color-status-ok); }
    100% { background: var(--color-paper-1); }
}

/* Flash error */
@keyframes scanFlashError {
    0%   { background: var(--color-paper-1); }
    20%  { background: var(--color-status-out-dim); border-color: var(--color-status-out); }
    100% { background: var(--color-paper-1); }
}

.part-card--flash-success {
    animation: scanFlashSuccess 800ms var(--ease-standard) forwards;
}

.part-card--flash-error {
    animation: scanFlashError 800ms var(--ease-standard) forwards;
}
```

---

## Part Image System

### Placeholder (Tanpa Gambar)

Jika tidak ada gambar, tampilkan icon berdasarkan kategori:

| Kategori | Material Icon |
|----------|--------------|
| Mechanical/Fastener | `hardware` |
| Mechanical/Bearing | `settings` |
| Mechanical/Valve | `valve` (atau `tune`) |
| Electrical/Cable | `cable` |
| Electrical/Control | `electric_bolt` |
| Electrical/Sensor | `sensors` |
| Consumable/Lubricant | `water_drop` |
| Consumable/Safety | `safety_check` |
| Uncategorized | `inventory_2` |
| Default | `category` |

Icon placeholder:
```css
.part-card__image-placeholder {
    background: var(--color-paper-3);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-ink-muted);
}

.part-card__image-placeholder .icon {
    font-size: 32px;
}
```

### Dengan Gambar

```css
.part-card__image {
    border-radius: 6px;
    object-fit: cover;
    width: 100%;
    height: 80px;  /* medium card */
    background: var(--color-paper-3);  /* fallback saat loading */
}
```

Image upload constraints:
- Max size: 5MB
- Accepted: JPG, PNG, WEBP
- Auto-resize ke max 800×800px saat disimpan
- Thumbnail 200×200px untuk grid card
- Storage: `data/images/parts/{part_id}.jpg`

---

## Grid View Modes

### Grid View (Default)

```
[Sort▼] [Filter▼] [■■■■] [·· ·] [≡]
                  ↑grid  ↑compact ↑list

┌──────┬──────┬──────┬──────┐
│ Card │ Card │ Card │ Card │  ← 4 columns default
├──────┼──────┼──────┼──────┤
│ Card │ Card │ Card │ Card │
└──────┴──────┴──────┴──────┘
```

### List View

```
[Sort▼] [Filter▼] [■■■■] [≡] ← list selected

┌──────────────────────────────────────────────────────────────────────┐
│  [img] Baut M6 Stainless    Mech/Fastener  150 pcs  ● OK  QR-0001  │
├──────────────────────────────────────────────────────────────────────┤
│  [img] Bearing 6205          Mech/Bearing    2 pcs  ⚠ LOW  QR-0042 │
├──────────────────────────────────────────────────────────────────────┤
│  [img] Seal O-Ring          Mech/Seal        0 pcs  ✕ OUT  QR-0088 │
└──────────────────────────────────────────────────────────────────────┘
```

### Compact View

```
Kartu sangat kecil, hanya icon + status + qty:

┌────┬────┬────┬────┬────┬────┬────┐
│●OK │⚠LO│✕OU│●OK │●OK │⚠LO│●OK │  ← 7+ columns
│150 │2   │0   │88  │240 │5   │320 │
└────┴────┴────┴────┴────┴────┴────┘
```

---

## Grid Interactions

### Click (Single)
- Buka **Part Detail Modal** (overlay)
- Shortcut Escape untuk tutup

### Double Click / Enter
- Fokus scan bar dengan part ini di-pre-fill
- Siap untuk scan transaksi

### Right Click
- Context menu:
  ```
  [qr_code_2] Lihat QR Code
  [print]     Print Label
  [edit]      Edit Part
  [history]   Lihat History
  ─────────────────────────
  [delete]    Hapus Part
  ```

### Keyboard Navigation
- Arrow keys: navigasi antar card
- Enter: buka detail
- Space: toggle select (multi-select mode)
- Q: buka QR preview
- E: buka edit form

---

## Filter & Sort Panel

### Filter Panel (Slide-in dari kanan)

```
┌─────────────────────────────────┐
│  Filters                    [✕] │
│  ─────────────────────────────  │
│  Status                         │
│  [✓] OK   [✓] LOW  [✓] OUT     │
│  [ ] Needs Review               │
│                                  │
│  Category                       │
│  [▼] Mechanical                 │
│      [✓] Fastener               │
│      [✓] Bearing                │
│  [▼] Electrical                 │
│      [✓] Cable                  │
│  [▼] Consumable                 │
│                                  │
│  MR Invoice                     │
│  [Search MR Invoice...        ] │
│  INV-2026-001 [✓]               │
│  INV-2026-002 [ ]               │
│                                  │
│  [Reset Filter]  [Terapkan ▶]  │
└─────────────────────────────────┘
```

### Sort Options

```
[ ] Nama A-Z            [●] Nama Z-A
[ ] Qty: Terbanyak      [ ] Qty: Tersedikit
[ ] Date: Terbaru       [ ] Date: Terlama
[ ] Status: OUT first
```

---

## Real-time Update

Ketika scan terjadi:

1. **Dashboard menerima event**: `stock-updated` via IPC
2. **Find card** by `partId` di DOM
3. **Update nilai**: `currentQty`, status badge
4. **Trigger flash animation** pada card
5. **Update KPI widgets** (total, in today, out today)

```javascript
// dashboard.js
window.api.onStockUpdated(({ partId, newQty, direction }) => {
    const card = document.querySelector(`[data-part-id="${partId}"]`);
    if (!card) return;
    
    // Update qty
    card.querySelector('.part-card__qty').textContent = `${newQty} pcs`;
    
    // Update status
    const status = getStockStatus(newQty, card.dataset.minQty);
    updateCardStatus(card, status);
    
    // Flash animation
    const flashClass = direction === 'IN' ? 'flash-success' : 'flash-out';
    card.classList.add(`part-card--${flashClass}`);
    setTimeout(() => card.classList.remove(`part-card--${flashClass}`), 800);
    
    // Update KPI
    updateKPIs();
});
```

---

## Empty States

### Grid Kosong (Belum ada data)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  [inventory_2]                     │
│                   (64px, muted)                    │
│                                                    │
│              Belum ada barang                      │
│                                                    │
│        Upload CSV atau tambah part baru            │
│        untuk mulai monitoring stock.               │
│                                                    │
│         [upload Import CSV]  [add Tambah Part]     │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Filter Tidak Ada Hasil

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  [filter_list]                     │
│                                                    │
│          Tidak ada barang yang cocok               │
│                                                    │
│           Filter aktif: Status = OUT               │
│                                                    │
│              [close Reset Filter]                  │
│                                                    │
└────────────────────────────────────────────────────┘
```
