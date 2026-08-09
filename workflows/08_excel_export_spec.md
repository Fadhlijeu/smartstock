# 08 — Excel Export Specification
## SAP StockMon · Spesifikasi Export Excel & Laporan

---

## Overview

SAP StockMon menghasilkan dua jenis laporan Excel utama:

1. **Stock Snapshot** — Kondisi stock saat ini, semua barang
2. **Transaction Log** — Riwayat scan masuk/keluar dalam periode tertentu

Library: **ExcelJS** (Node.js) — pilih ini karena bisa styling cell, formula, dan stream output.

---

## Report 1: Stock Snapshot

### Filename
```
StockReport_{YYYYMMDD}_{HHMMSS}.xlsx
Contoh: StockReport_20260809_143022.xlsx
```

### Sheet Structure

**Sheet 1: "Summary"**

```
╔════════════════════════════════════════════════════════════════════╗
║  [Logo area]          SAP StockMon — Stock Report                ║
║                       Generated: 09 Agustus 2026, 14:30:22       ║
╠════════════════════════════════════════════════════════════════════╣
║  Total SKU    │  247 ║  Total Items  │  3,841 ║                   ║
║  OK Items     │  231 ║  Low Items    │   12   ║  Out Items │  4   ║
╚════════════════════════════════════════════════════════════════════╝
```

**Sheet 2: "Stock Detail"** (data utama)

| # | QR ID | Serial Number | Date Entry | MR Invoice | Purchase Order | Description | Category | Initial Qty | Current Qty | Unit | Min Qty | Status | Last Transaction |
|---|-------|---------------|------------|------------|----------------|-------------|----------|-------------|-------------|------|---------|--------|-----------------|
| 1 | QR-2026-0001 | FAST-2026-0001 | 09/08/2026 | INV-2026-001 | PO-2026-100 | Baut M6 Stainless | Mechanical/Fastener | 200 | 150 | pcs | 10 | OK | 09/08/2026 10:42 |
| 2 | QR-2026-0042 | BEAR-2026-0001 | 05/08/2026 | INV-2026-001 | PO-2026-100 | Bearing 6205 | Mechanical/Bearing | 20 | 2 | pcs | 5 | LOW | 08/08/2026 15:30 |

**Sheet 3: "By Category"** (pivot sederhana)

| Category | SKU Count | Total Items | OK | LOW | OUT |
|----------|-----------|-------------|----|----|-----|
| Mechanical/Fastener | 45 | 1,250 | 42 | 2 | 1 |
| Mechanical/Bearing | 12 | 180 | 10 | 2 | 0 |

---

## Report 2: Transaction Log

### Filename
```
TransactionLog_{YYYYMMDD}_{YYYYMMDD}.xlsx
Contoh: TransactionLog_20260801_20260809.xlsx
```

### Sheet: "Transactions"

| # | Timestamp | QR ID | Serial Number | Part Name | Category | Direction | Qty | Stock Before | Stock After | Operator | Note |
|---|-----------|-------|---------------|-----------|----------|-----------|-----|--------------|-------------|----------|------|
| 1 | 09/08/2026 10:42:05 | QR-2026-0001 | FAST-2026-0001 | Baut M6 Stainless | Mechanical/Fastener | IN | 50 | 100 | 150 | — | — |
| 2 | 09/08/2026 10:38:12 | QR-2026-0003 | CABL-2026-0001 | Kabel NYA 2.5mm | Electrical/Cable | OUT | 5 | 105 | 100 | Admin | Untuk panel B |

---

## Excel Styling (ExcelJS)

### Color Palette

```javascript
const EXCEL_COLORS = {
    // Header
    headerBg: 'FF1E293B',      // dark slate
    headerText: 'FFFFFFFF',    // white
    
    // Status rows
    statusOkBg: 'FF16A34A',    // green-600
    statusLowBg: 'FFD97706',   // amber-600
    statusOutBg: 'FFDC2626',   // red-600
    statusOkLight: 'FFBBF7D0', // green-200 (row highlight)
    statusLowLight: 'FFFDE68A',// amber-200
    statusOutLight: 'FFFECACA',// red-200
    
    // Alternating rows
    rowAlt: 'FFF8FAFC',        // slate-50
    rowDefault: 'FFFFFFFF',    // white
    
    // Border
    border: 'FFE2E8F0',        // slate-200
    
    // Accent
    accent: 'FF3B82F6',        // blue-500
};
```

### Header Style

```javascript
// Fungsi untuk apply header style
function styleHeaderRow(worksheet, rowNumber) {
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: EXCEL_COLORS.headerBg }
        };
        cell.font = {
            color: { argb: EXCEL_COLORS.headerText },
            bold: true,
            size: 11,
            name: 'Calibri'
        };
        cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: false
        };
        cell.border = {
            bottom: { style: 'medium', color: { argb: EXCEL_COLORS.accent } }
        };
    });
    row.height = 30;
}
```

### Status Row Highlighting

```javascript
function styleDataRow(row, status, rowIndex) {
    const isAlt = rowIndex % 2 === 0;
    
    const bgMap = {
        'OK': isAlt ? EXCEL_COLORS.rowAlt : EXCEL_COLORS.rowDefault,
        'LOW': EXCEL_COLORS.statusLowLight,
        'OUT': EXCEL_COLORS.statusOutLight,
    };
    
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgMap[status] }
        };
        cell.border = {
            bottom: { style: 'thin', color: { argb: EXCEL_COLORS.border } }
        };
        cell.font = { size: 10, name: 'Calibri' };
        cell.alignment = { vertical: 'middle' };
    });
    
    row.height = 22;
}
```

### Status Cell

```javascript
function styleStatusCell(cell, status) {
    const colorMap = {
        'OK':  { bg: EXCEL_COLORS.statusOkBg,  text: 'FFFFFFFF' },
        'LOW': { bg: EXCEL_COLORS.statusLowBg,  text: 'FFFFFFFF' },
        'OUT': { bg: EXCEL_COLORS.statusOutBg,  text: 'FFFFFFFF' },
    };
    
    const colors = colorMap[status];
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } };
    cell.font = { color: { argb: colors.text }, bold: true, size: 9, name: 'Calibri' };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
}
```

---

## Excel Generation Code (Template)

```javascript
// excel.exporter.js
const ExcelJS = require('exceljs');
const path = require('path');

async function exportStockSnapshot(parts, outputDir) {
    const workbook = new ExcelJS.Workbook();
    
    // Metadata
    workbook.creator = 'SAP StockMon';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // ─── Sheet 1: Summary ───────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
        { width: 20 }, { width: 15 }, { width: 20 }, { width: 15 }
    ];
    
    // Title
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'SAP StockMon — Stock Report';
    titleCell.font = { size: 16, bold: true, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center' };
    summarySheet.getRow(1).height = 40;
    
    // Generated timestamp
    summarySheet.mergeCells('A2:D2');
    summarySheet.getCell('A2').value = 
        `Generated: ${new Date().toLocaleString('id-ID')}`;
    summarySheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };
    summarySheet.getCell('A2').alignment = { horizontal: 'center' };
    
    // KPI Summary Row
    const stats = computeStats(parts);
    summarySheet.addRow([]);
    summarySheet.addRow(['Total SKU', stats.totalSku, 'Total Items', stats.totalItems]);
    summarySheet.addRow(['OK', stats.ok, 'LOW', stats.low]);
    summarySheet.addRow(['OUT', stats.out, 'Needs Review', stats.review]);
    
    // ─── Sheet 2: Stock Detail ───────────────────────────────────
    const detailSheet = workbook.addWorksheet('Stock Detail');
    
    const columns = [
        { header: '#',              key: 'no',          width: 5 },
        { header: 'QR ID',          key: 'qrId',         width: 16 },
        { header: 'Serial Number',  key: 'serialNumber', width: 20 },
        { header: 'Date Entry',     key: 'dateEntry',    width: 14 },
        { header: 'MR Invoice',     key: 'mrInvoice',    width: 18 },
        { header: 'Purchase Order', key: 'purchaseOrder',width: 18 },
        { header: 'Description',    key: 'description',  width: 35 },
        { header: 'Category',       key: 'category',     width: 22 },
        { header: 'Initial Qty',    key: 'initialQty',   width: 12 },
        { header: 'Current Qty',    key: 'currentQty',   width: 12 },
        { header: 'Unit',           key: 'unit',         width: 8 },
        { header: 'Min Qty',        key: 'minQty',       width: 10 },
        { header: 'Status',         key: 'status',       width: 10 },
        { header: 'Last Scan',      key: 'lastScan',     width: 20 },
    ];
    
    detailSheet.columns = columns;
    styleHeaderRow(detailSheet, 1);
    
    parts.forEach((part, index) => {
        const status = getStockStatus(part);
        const row = detailSheet.addRow({
            no: index + 1,
            qrId: part.qrId,
            serialNumber: part.serialNumber,
            dateEntry: formatDate(part.dateEntry),
            mrInvoice: part.mrInvoice,
            purchaseOrder: part.purchaseOrder,
            description: part.description,
            category: part.category,
            initialQty: part.initialQty,
            currentQty: part.currentQty,
            unit: part.unit,
            minQty: part.minQty,
            status: status,
            lastScan: part.lastScan ? formatDateTime(part.lastScan) : '—',
        });
        
        styleDataRow(row, status, index);
        styleStatusCell(row.getCell('status'), status);
        
        // Qty highlighting jika LOW
        if (status === 'LOW' || status === 'OUT') {
            const qtyCell = row.getCell('currentQty');
            qtyCell.font = { bold: true, size: 10, name: 'Calibri' };
        }
    });
    
    // Freeze header row
    detailSheet.views = [{ state: 'frozen', ySplit: 1 }];
    
    // Auto-filter
    detailSheet.autoFilter = {
        from: 'A1',
        to: detailSheet.getCell(1, columns.length).address
    };
    
    // ─── Sheet 3: By Category ───────────────────────────────────
    const catSheet = workbook.addWorksheet('By Category');
    // ... generate pivot by category
    
    // Save
    const filename = `StockReport_${formatDateFilename(new Date())}.xlsx`;
    const outputPath = path.join(outputDir, filename);
    await workbook.xlsx.writeFile(outputPath);
    
    return outputPath;
}
```

---

## Export UI

### Export Dialog

```
┌──────────────────────────────────────────────────────┐
│  [download] Export Laporan                       [✕] │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  Jenis Laporan:                                      │
│  (●) Stock Snapshot — kondisi saat ini               │
│  ( ) Transaction Log — riwayat scan                  │
│                                                      │
│  ── Periode (untuk Transaction Log) ─────────────    │
│  Dari: [09/08/2026]    Sampai: [09/08/2026]          │
│                                                      │
│  ── Filter Opsional ─────────────────────────────    │
│  Category:    [Semua ▼]                              │
│  MR Invoice:  [Semua ▼]                              │
│  Status:      [✓] OK  [✓] LOW  [✓] OUT              │
│                                                      │
│  ── Format ──────────────────────────────────────    │
│  [●] Excel (.xlsx)   ( ) PDF                         │
│                                                      │
│              [cancel Batal]  [download Export]       │
└──────────────────────────────────────────────────────┘
```

### Export Progress

```
┌──────────────────────────────────────────────────┐
│  Generating report...                             │
│                                                   │
│  ████████████████░░░░  78%                       │
│  Memproses 247 dari 320 items...                  │
│                                                   │
│               [Batalkan]                          │
└──────────────────────────────────────────────────┘
```

### Export Sukses

```
Toast (bottom-right):
[✓ Export berhasil]  StockReport_20260809.xlsx  [Buka File ↗]
```

---

## QR Label PDF Export

### Library: pdfkit

```javascript
// pdf.exporter.js
const PDFDocument = require('pdfkit');

async function exportQRLabelSheet(parts, labelSize, outputPath) {
    const doc = new PDFDocument({ size: 'A4', margin: 10 });
    
    const LABEL_SIZES = {
        '30x30': { w: 85, h: 85, cols: 7, rows: 10 },
        '50x50': { w: 141, h: 141, cols: 4, rows: 7 },
        '100x100': { w: 283, h: 283, cols: 2, rows: 3 },
    };
    
    const { w, h, cols, rows } = LABEL_SIZES[labelSize];
    const MARGIN = 14;
    
    let col = 0, row = 0;
    
    for (const part of parts) {
        const x = MARGIN + col * (w + 4);
        const y = MARGIN + row * (h + 4);
        
        // QR image
        doc.image(part.qrImagePath, x + 5, y + 5, { width: w - 10 });
        
        // Text below QR
        doc.fontSize(6).text(part.description.slice(0, 25), x, y + w - 20, { 
            width: w, align: 'center' 
        });
        doc.fontSize(5).text(part.serialNumber, x, y + w - 13, { 
            width: w, align: 'center' 
        });
        doc.fontSize(5).text(`QTY: ${part.currentQty} ${part.unit}`, x, y + w - 7, { 
            width: w, align: 'center' 
        });
        
        // Border
        doc.rect(x, y, w, h).stroke('#CCCCCC');
        
        col++;
        if (col >= cols) {
            col = 0;
            row++;
            if (row >= rows) {
                doc.addPage();
                col = 0;
                row = 0;
            }
        }
    }
    
    doc.pipe(require('fs').createWriteStream(outputPath));
    doc.end();
    
    return outputPath;
}
```

---

## Format Helpers

```javascript
// formatter.js
function formatDate(isoDate) {
    const d = new Date(isoDate);
    return d.toLocaleDateString('id-ID', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
    }); // "09/08/2026"
}

function formatDateTime(isoTimestamp) {
    const d = new Date(isoTimestamp);
    return d.toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }); // "09/08/2026 14:30"
}

function formatDateFilename(date) {
    return date.toISOString().slice(0, 10).replace(/-/g, ''); // "20260809"
}

function formatNumber(n) {
    return n.toLocaleString('id-ID'); // "3.841"
}
```
