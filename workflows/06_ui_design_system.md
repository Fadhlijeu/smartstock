# 06 — UI Design System
## SAP StockMon · Design System & Visual Identity

---

<!-- Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 -->
<!-- Genre: modern-minimal · Theme: custom (Cobalt-adjacent, enterprise-dark) -->
<!-- Macrostructure: Workbench (app shell) -->
<!-- Skills referenced: hallmark, ui-ux-pro-max, design-system-architect, responsive-dashboard-builder -->

---

## Design Philosophy

> **"Data adalah pekerja. UI adalah alat. Setiap piksel harus earning its place."**

SAP StockMon adalah tool enterprise, bukan landing page. UI-nya harus:

1. **Keyboard-first** — warehouse operator tidak punya waktu untuk click 5 kali
2. **Data-dense** — 500 parts harus kelihatan sekaligus tanpa overwhelm
3. **Instantly readable** — status OK/LOW/OUT terlihat dari 3 meter jauh
4. **Premium, bukan kaku** — lebih Linear/Raycast dari SAP GUI lama

**Tiga Prinsip:**
1. **Speed over clicks** — aksi paling umum maksimal 1 shortcut
2. **Status visible everywhere** — tidak perlu buka detail untuk tahu kondisi
3. **Error is information** — error merah bukan kegagalan, tapi sinyal berguna

---

## Genre & Tone

Dari Hallmark Design System:
- **Genre**: Modern-minimal — enterprise tool, B2B, developer-grade
- **Tone**: Utilitarian × Technical — seperti Linear tapi untuk warehouse
- **Inspirasi**: Linear (dark mode, shortcuts), SAP Business One (grid layout), Raycast (speed), Vercel Dashboard (data density)

---

## Color System

### Token Definitions

```css
:root {
    /* ── PAPER (Dark Mode Default) ── */
    --color-paper-base:    oklch(9% 0.012 255);     /* near-black, slightly blue */
    --color-paper-1:       oklch(13% 0.014 255);    /* card surface */
    --color-paper-2:       oklch(17% 0.014 255);    /* elevated surface */
    --color-paper-3:       oklch(22% 0.014 255);    /* hover surface */
    --color-paper-border:  oklch(26% 0.014 255);    /* subtle border */
    --color-paper-divider: oklch(20% 0.010 255);    /* section divider */
    
    /* ── INK ── */
    --color-ink-primary:   oklch(95% 0.005 255);    /* headings, labels */
    --color-ink-secondary: oklch(65% 0.008 255);    /* body, metadata */
    --color-ink-muted:     oklch(42% 0.006 255);    /* placeholder, disabled */
    --color-ink-inverse:   oklch(10% 0.010 255);    /* teks di atas accent */
    
    /* ── ACCENT (Corporate Blue) ── */
    --color-accent:        oklch(68% 0.20 258);     /* cool enterprise blue */
    --color-accent-dim:    oklch(68% 0.20 258 / 0.15);
    --color-accent-hover:  oklch(72% 0.22 258);
    --color-accent-glow:   oklch(68% 0.20 258 / 0.08);
    
    /* ── STATUS COLORS ── */
    --color-status-ok:     oklch(68% 0.18 145);     /* sage green — OK */
    --color-status-ok-dim: oklch(68% 0.18 145 / 0.15);
    --color-status-low:    oklch(78% 0.18 72);      /* amber — LOW STOCK */
    --color-status-low-dim:oklch(78% 0.18 72 / 0.15);
    --color-status-out:    oklch(62% 0.22 25);      /* muted red — OUT */
    --color-status-out-dim:oklch(62% 0.22 25 / 0.15);
    --color-status-review: oklch(72% 0.18 52);      /* warm amber — NEEDS REVIEW */
    
    /* ── SEMANTIC ── */
    --color-success:       oklch(68% 0.18 145);
    --color-error:         oklch(62% 0.22 25);
    --color-warning:       oklch(78% 0.18 72);
    --color-info:          oklch(68% 0.20 258);
    
    /* ── OVERLAY ── */
    --color-scrim:         oklch(0% 0 0 / 0.80);
    --color-glass:         oklch(13% 0.012 255 / 0.85);
    --color-glass-border:  oklch(100% 0 0 / 0.06);
    
    /* ── FOCUS ── */
    --color-focus:         oklch(68% 0.20 258);
    --color-focus-ring:    oklch(68% 0.20 258 / 0.4);
    
    /* ── SCAN FEEDBACK ── */
    --color-scan-success:  oklch(68% 0.18 145);     /* flash hijau */
    --color-scan-error:    oklch(62% 0.22 25);      /* flash merah */
    --color-scan-warning:  oklch(78% 0.18 72);      /* flash kuning */
}
```

### Light Mode Override

```css
@media (prefers-color-scheme: light) {
    :root[data-theme="light"] {
        --color-paper-base:    oklch(98% 0.004 255);
        --color-paper-1:       oklch(95% 0.006 255);
        --color-paper-2:       oklch(91% 0.006 255);
        --color-paper-3:       oklch(87% 0.006 255);
        --color-paper-border:  oklch(82% 0.008 255);
        --color-paper-divider: oklch(88% 0.006 255);
        
        --color-ink-primary:   oklch(12% 0.012 255);
        --color-ink-secondary: oklch(38% 0.010 255);
        --color-ink-muted:     oklch(60% 0.008 255);
        
        /* Status & accent tetap sama */
    }
}
```

---

## Typography

### Font Stack

```css
:root {
    --font-display: "Inter", "Helvetica Neue", system-ui, sans-serif;  /* heading */
    --font-body:    "Inter", "Helvetica Neue", system-ui, sans-serif;  /* UI text */
    --font-mono:    "JetBrains Mono", "Fira Code", "Consolas", monospace; /* code, IDs */
}
```

Loading via Google Fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
```

### Type Scale

```css
:root {
    --text-2xs:  10px;   /* badge micro, status label */
    --text-xs:   11px;   /* table cell secondary */
    --text-sm:   12px;   /* caption, metadata, timestamp */
    --text-base: 13px;   /* body, default UI */
    --text-md:   14px;   /* prominent body, card content */
    --text-lg:   16px;   /* section title, modal heading */
    --text-xl:   20px;   /* page heading */
    --text-2xl:  28px;   /* KPI numbers */
    --text-3xl:  40px;   /* hero KPI / big count */
}
```

### Typographic Rules

- **Label/Nav**: `--font-body`, weight 500, `--text-sm`
- **Card title**: `--font-body`, weight 600, `--text-md`
- **KPI number**: `--font-body`, weight 700, `--text-3xl`, tabular nums
- **QR ID/Serial**: `--font-mono`, weight 400, `--text-sm`
- **Timestamp**: `--font-mono`, weight 400, `--text-xs`, `--color-ink-muted`
- Tidak ada italic di UI. Emphasis via weight atau accent color.

---

## Spacing System (4pt Grid)

```css
:root {
    --space-1:  4px;
    --space-2:  8px;
    --space-3:  12px;
    --space-4:  16px;
    --space-5:  20px;
    --space-6:  24px;
    --space-8:  32px;
    --space-10: 40px;
    --space-12: 48px;
    --space-16: 64px;
}
```

---

## Iconography

**Wajib menggunakan Google Fonts Material Symbols Outlined.** Tidak ada emoji, tidak ada SVG custom kecuali dibutuhkan.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
```

```css
.icon {
    font-family: 'Material Symbols Outlined';
    font-weight: 300;
    font-size: 20px;
    line-height: 1;
    font-style: normal;
    display: inline-flex;
    align-items: center;
    user-select: none;
}

.icon--sm { font-size: 16px; }
.icon--md { font-size: 20px; }   /* default */
.icon--lg { font-size: 24px; }
.icon--xl { font-size: 32px; }
```

### Icon Map

| Context | Material Symbol | Weight |
|---------|----------------|--------|
| Dashboard / Grid | `grid_view` | 300 |
| Scanner / Scan | `barcode_scanner` | 300 |
| Parts / Inventory | `inventory_2` | 300 |
| Transactions | `receipt_long` | 300 |
| Export / Reports | `download` | 300 |
| Settings | `settings` | 300 |
| Add / New | `add` | 400 |
| Edit | `edit` | 300 |
| Delete / Remove | `delete` | 300 |
| Search | `search` | 300 |
| Filter | `filter_list` | 300 |
| Sort | `sort` | 300 |
| QR Code | `qr_code_2` | 300 |
| Print / Label | `print` | 300 |
| Upload / Import | `upload` | 300 |
| Check / OK | `check_circle` | 400 |
| Warning / Low | `warning` | 400 |
| Error / Out | `cancel` | 400 |
| Info | `info` | 300 |
| Close | `close` | 400 |
| Expand | `expand_more` | 400 |
| Part Image | `image` | 300 |
| Category | `category` | 300 |
| Stock IN | `login` | 300 |
| Stock OUT | `logout` | 300 |
| History / Log | `history` | 300 |
| Keyboard shortcut | `keyboard` | 300 |

---

## Component Library

### Grid Card (Part Card)

```
┌──────────────────────────────────┐
│  [icon/img]     ● OK             │  ← status badge
│                                  │
│  Baut M6 Stainless               │  ← name (weight 600)
│  MECH/FAST  •  SN: FAST-0001    │  ← category + serial (mono)
│                                  │
│  ══════════════════════════════  │  ← divider
│                                  │
│  150 pcs               QR-0001  │  ← qty (big, bold) + QR ID
└──────────────────────────────────┘
```

Status badge variants:
- `● OK` → `--color-status-ok`, background `--color-status-ok-dim`
- `● LOW` → `--color-status-low`, background `--color-status-low-dim`
- `● OUT` → `--color-status-out`, background `--color-status-out-dim`
- `⚠ REVIEW` → `--color-status-review`

Card sizes:
- **Small** (3+ columns): 180px min-width
- **Medium** (default, 4 columns): 220px min-width  
- **Large** (2 columns): 320px min-width

```css
.part-card {
    background: var(--color-paper-1);
    border: 1px solid var(--color-paper-border);
    border-radius: 10px;
    padding: var(--space-4);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard);
}

.part-card:hover {
    background: var(--color-paper-2);
    border-color: var(--color-accent-dim);
    transform: translateY(-1px);
}

.part-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
}

.part-card--selected {
    border-color: var(--color-accent);
    background: var(--color-accent-glow);
}

.part-card--out {
    border-left: 3px solid var(--color-status-out);
}

.part-card--low {
    border-left: 3px solid var(--color-status-low);
}
```

### Scan Bar

```
┌────────────────────────────────────────────────────────────────┐
│  [barcode_scanner]  Scan atau ketik barcode...    [IN] [OUT]  │
└────────────────────────────────────────────────────────────────┘
        ↑ focused saat scanner mode aktif, amber pulse border
```

```css
.scan-bar {
    background: var(--color-paper-1);
    border: 2px solid var(--color-paper-border);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    transition: border-color var(--duration-fast);
}

.scan-bar--active {
    border-color: var(--color-accent);
    animation: scanPulse 2s ease-in-out infinite;
}

@keyframes scanPulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--color-accent-dim); }
    50% { box-shadow: 0 0 0 6px transparent; }
}
```

### KPI Widget

```
┌──────────────────┐
│  inventory_2     │
│  1,247           │  ← big number, tabular-nums
│  Total SKUs      │  ← label kecil
└──────────────────┘
```

```css
.kpi-widget {
    background: var(--color-paper-1);
    border: 1px solid var(--color-paper-border);
    border-radius: 10px;
    padding: var(--space-5) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.kpi-widget__number {
    font-size: var(--text-3xl);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-primary);
    line-height: 1;
}

.kpi-widget__label {
    font-size: var(--text-sm);
    color: var(--color-ink-secondary);
}
```

### Toast Notification

```
Position: bottom-right, stack max 3
Duration: 3 detik auto-dismiss (error: 6 detik, perlu dismiss manual)

[● Scan berhasil]  Baut M6 — IN +50 pcs  [✕]  ← success (hijau)
[⚠ Stok rendah]   Bearing 6205 tersisa 2  [✕]  ← warning (kuning)
[✕ Part tidak ada] QR-XXXX tidak ada di DB [✕]  ← error (merah)
```

### Modal Dialog

Konfirmasi scan, detail part, QR preview — semua gunakan modal center:
```css
.modal-backdrop {
    background: var(--color-scrim);
    backdrop-filter: blur(4px);
}

.modal {
    background: var(--color-paper-2);
    border: 1px solid var(--color-paper-border);
    border-radius: 14px;
    box-shadow: 0 24px 80px oklch(0% 0 0 / 0.6);
    max-width: 480px;
    width: 90%;
}
```

### Data Table (Transactions)

```
┌──────────┬────────────────────┬───────┬──────┬──────────────────┐
│ Time     │ Part               │ Dir   │ Qty  │ Operator         │
├──────────┼────────────────────┼───────┼──────┼──────────────────┤
│ 10:42:05 │ Baut M6 Stainless  │ ▲ IN  │ +50  │ —                │
│ 10:38:12 │ Kabel NYA 2.5mm    │ ▼ OUT │ −5   │ —                │
└──────────┴────────────────────┴───────┴──────┴──────────────────┘
```

Direction indicator:
- `▲ IN` → `--color-status-ok`
- `▼ OUT` → `--color-status-out`

---

## Layout Sistem

### App Shell

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR (220px fixed)  │  MAIN CONTENT (flex-1)                │
│                          │                                       │
│  ● StockMon              │  ┌─────── TOPBAR (56px) ───────────┐ │
│                          │  │  [page title]     [actions...]  │ │
│  [grid_view] Dashboard   │  └───────────────────────────────┘  │
│  [barcode_scanner] Scan  │                                       │
│  [inventory_2] Parts     │  ┌─────── PAGE CONTENT ────────────┐ │
│  [receipt_long] History  │  │                                  │ │
│  [download] Reports      │  │                                  │ │
│                          │  │                                  │ │
│  ─────────────────────   │  │                                  │ │
│  [settings] Settings     │  └──────────────────────────────────┘ │
└──────────────────────────┴─────────────────────────────────────┘
```

Sidebar bisa **collapse ke 56px** (icon only) via toggle. State disimpan ke localStorage.

### Grid Dashboard Layout

```
TOPBAR: [Sort ▼] [Filter ▼] [View: Grid|List|Compact] [+ Add Part]

KPI ROW: [Total SKU: 247] [Total Items: 3,841] [IN Today: 125] [OUT Today: 48] [Review: 3]

SCAN BAR: [barcode_scanner icon] [input] [IN / OUT toggle]

GRID:
┌──────┬──────┬──────┬──────┐
│ Card │ Card │ Card │ Card │
├──────┼──────┼──────┼──────┤
│ Card │ Card │ Card │ Card │
└──────┴──────┴──────┴──────┘
```

Grid responsive:
- > 1600px: 5 kolom
- 1200–1600px: 4 kolom (default)
- 900–1200px: 3 kolom
- < 900px: 2 kolom

---

## Motion & Animation

### Token

```css
:root {
    --duration-instant: 80ms;    /* scan feedback, status flash */
    --duration-fast:    150ms;   /* hover, focus */
    --duration-normal:  220ms;   /* state change, expand */
    --duration-slow:    350ms;   /* modal, page transition */
    --ease-standard:    cubic-bezier(0.2, 0, 0, 1);
    --ease-enter:       cubic-bezier(0, 0, 0.2, 1);
    --ease-exit:        cubic-bezier(0.4, 0, 1, 1);
    --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Micro-animations

| Element | Animasi |
|---------|---------|
| Scan success | Card flash hijau 300ms → kembali normal |
| Scan error | Shake horizontal 3× + flash merah |
| New part card | Scale-in dari 0.8 + fade, spring easing |
| Status badge | Color crossfade saat qty berubah |
| Toast appear | Slide-up dari bawah + fade |
| Modal open | Scale dari 0.95 + fade, 220ms |
| Sidebar collapse | Width transition 220ms |
| KPI number | Counter animation saat nilai berubah |

---

## Keyboard Shortcuts

```
Global:
  Ctrl+K         → Command palette / quick search
  Ctrl+N         → New part form
  Ctrl+I         → Toggle scanner mode (IN)
  Ctrl+O         → Toggle scanner mode (OUT)
  Ctrl+E         → Export dialog
  Escape         → Close modal / cancel
  ?              → Keyboard shortcuts help

Dashboard:
  /              → Focus search bar
  G D            → Go to Dashboard
  G P            → Go to Parts
  G H            → Go to History
  G R            → Go to Reports
  
  1-5            → Switch grid column count
  F              → Open filter panel
  S              → Open sort panel
```

---

## Screen Layouts

### Dashboard (Main View)

```
┌─────────────────────────────────────────────────────┐
│ ● StockMon   │  Dashboard               [+] [↓] [⌨] │
│              │ ────────────────────────────────────── │
│ Dashboard ←  │  KPI: [247 SKU] [3841 Items] [+125 IN]│
│ Scan         │ ────────────────────────────────────── │
│ Parts        │  [scan icon] Scan barcode...  [IN][OUT]│
│ History      │ ────────────────────────────────────── │
│ Reports      │                                        │
│              │  [Sort▼] [Filter▼] [■■] [≡] [·]       │
│ ───────────  │                                        │
│ Settings     │  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│              │  │ OK │ │LOW │ │ OK │ │OUT │          │
│              │  └────┘ └────┘ └────┘ └────┘          │
└──────────────┴────────────────────────────────────────┘
```

### Part Detail Modal

```
┌────────────────────────────────────────────────┐
│  [Part image 80×80]  Baut M6 Stainless    [✕] │
│                      SN: FAST-2026-0001        │
│                      QR: QR-2026-0001          │
│  ─────────────────────────────────────────     │
│  Date Entry    2026-08-09                      │
│  MR Invoice    INV-2026-1234                   │
│  Purchase Order PO-2026-5678                   │
│  Description   Baut M6 Stainless Steel Grade A │
│  Category      Mechanical / Fastener  [Edit]   │
│  ─────────────────────────────────────────     │
│  Current Stock   150 pcs    ● OK               │
│  Initial Stock   200 pcs                       │
│  Min Stock       10 pcs                        │
│  ─────────────────────────────────────────     │
│  [qr_code_2 Lihat QR]  [print Print Label]    │
│  [receipt_long History]  [edit Edit]  [delete] │
└────────────────────────────────────────────────┘
```

---

## Accessibility Checklist

- [ ] Semua icon buttons memiliki `aria-label`
- [ ] Focus ring visible (2px solid `--color-focus`)
- [ ] Contrast ratio: teks primer ≥ 7:1, teks sekunder ≥ 4.5:1
- [ ] Status tidak hanya dari warna — tambahkan teks (OK/LOW/OUT)
- [ ] Scan beep bisa dimatikan di Settings
- [ ] `prefers-reduced-motion`: hilangkan semua animasi dekoratif
- [ ] Tab order logis: sidebar → topbar → content → modal
- [ ] Error messages spesifik dan actionable
