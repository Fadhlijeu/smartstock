/**
 * reports.js - Laporan & Export View (Remake & Full Polish)
 * Fitur:
 * - Stock Snapshot Excel Export
 * - Transaction Log Excel Export
 * - Low Stock Alert Excel Export
 * - Printable QR Label Sheet Generator & Print Dialog
 */

import { toast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

export async function mount(container) {
  let stats = { totalSku: 0, totalItems: 0, outCount: 0, lowCount: 0 };
  try {
    const res = await window.api.getKpiStats();
    if (res.success) stats = res.data;
  } catch (_) {}

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Laporan & Export</h2>
        <p style="font-size:var(--text-sm);color:var(--color-ink-muted);margin-top:2px">
          Export workbook Excel untuk audit stok, reorder, dan print sheet label barcode
        </p>
      </div>
    </div>

    <!-- Quick Status Stats -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3);margin-bottom:var(--space-6)">
      <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-md);padding:var(--space-4)">
        <div style="font-size:var(--text-xs);color:var(--color-ink-muted);text-transform:uppercase;font-weight:600">Total SKU Aktif</div>
        <div style="font-size:var(--text-2xl);font-weight:700;margin-top:2px">${stats.totalSku.toLocaleString('id')}</div>
      </div>
      <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-md);padding:var(--space-4)">
        <div style="font-size:var(--text-xs);color:var(--color-ink-muted);text-transform:uppercase;font-weight:600">Total Fisik Barang</div>
        <div style="font-size:var(--text-2xl);font-weight:700;margin-top:2px">${stats.totalItems.toLocaleString('id')}</div>
      </div>
      <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-md);padding:var(--space-4)">
        <div style="font-size:var(--text-xs);color:var(--color-status-low);text-transform:uppercase;font-weight:600">Perlu Reorder (LOW)</div>
        <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-status-low);margin-top:2px">${stats.lowCount.toLocaleString('id')}</div>
      </div>
      <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-md);padding:var(--space-4)">
        <div style="font-size:var(--text-xs);color:var(--color-status-out);text-transform:uppercase;font-weight:600">Stok Habis (OUT)</div>
        <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-status-out);margin-top:2px">${stats.outCount.toLocaleString('id')}</div>
      </div>
    </div>

    <!-- Export Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--space-4)">
      ${renderReportCard(
        'Stock Snapshot',
        'Semua SKU aktif dengan stok terkini, status, kategori, invoice, dan purchase order.',
        'table_chart',
        'Excel (.xlsx)',
        'btn-stock-snapshot',
        'primary'
      )}
      ${renderReportCard(
        'Transaction Log',
        'Semua transaksi IN/OUT lengkap dengan stok sebelum dan sesudah.',
        'receipt_long',
        'Excel (.xlsx)',
        'btn-tx-log',
        'secondary'
      )}
      ${renderReportCard(
        'Low Stock Alert',
        'Daftar barang LOW & OUT untuk kebutuhan reorder atau audit fisik.',
        'warning',
        'Excel (.xlsx)',
        'btn-low-stock',
        'secondary'
      )}
      ${renderReportCard(
        'Print QR Label Sheet',
        'Cetak lembar stiker QR Code fisik untuk penempelan pada box/rak barang.',
        'qr_code_2',
        'Print / PDF',
        'btn-qr-labels',
        'primary'
      )}
    </div>

    <!-- Info Banner -->
    <div style="margin-top:var(--space-6);padding:var(--space-5);background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);display:flex;align-items:center;gap:var(--space-4)">
      <span class="icon icon--xl" style="color:var(--color-accent)">verified_user</span>
      <div>
        <div style="font-size:var(--text-md);font-weight:600">Export Terenkripsi &amp; 100% Offline</div>
        <div style="font-size:var(--text-sm);color:var(--color-ink-muted);line-height:1.6">
          Semua file laporan dibuat langsung di sistem komputer lokal Anda tanpa koneksi cloud, menjamin kerahasiaan data pergudangan.
        </div>
      </div>
    </div>
  `;

  bindEvents(container);
}

function bindEvents(container) {
  container.querySelector('#btn-stock-snapshot')?.addEventListener('click', () => runExport('stock', 'Stock Snapshot'));
  container.querySelector('#btn-tx-log')?.addEventListener('click', () => runExport('transactions', 'Transaction Log'));
  container.querySelector('#btn-low-stock')?.addEventListener('click', () => runExport('lowStock', 'Low Stock Alert'));
  container.querySelector('#btn-qr-labels')?.addEventListener('click', () => openPrintLabelSheet());
}

async function runExport(type, label) {
  const res = await window.api.exportExcel(type, {});
  if (res.success) {
    toast.success('Export Berhasil', `${label} berhasil disimpan sebagai Excel.`);
  } else if (res.error.code !== 'CANCELED') {
    toast.error('Export Gagal', res.error.message);
  }
}

async function openPrintLabelSheet() {
  try {
    const partsRes = await window.api.getParts({ limit: 100 });
    if (!partsRes.success || !partsRes.data.length) {
      toast.warning('Tidak Ada Barang', 'Belum ada data barang untuk dicetak');
      return;
    }

    const parts = partsRes.data;

    openModal({
      title: 'Print Sheet Label QR',
      size: 'wide',
      body: `
        <div style="margin-bottom:var(--space-4);display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:var(--text-sm);color:var(--color-ink-muted)">
            Preview lembar stiker (${parts.length} barang) — Siap dicetak ke printer stiker / A4
          </span>
          <button class="btn btn--primary btn--sm" id="btn-print-now">
            <span class="icon icon--sm">print</span> Cetak Sekarang
          </button>
        </div>

        <div id="print-sheet-area" style="
          display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--space-3);
          max-height:420px;overflow-y:auto;padding:var(--space-3);
          background:white;color:black;border-radius:var(--radius-md);
        ">
          ${parts.map((p) => `
            <div style="
              border:1px dashed #ccc;padding:8px;border-radius:6px;text-align:center;
              background:#fafafa;page-break-inside:avoid;
            ">
              <div style="font-weight:700;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111">${escHtml(p.description)}</div>
              <div style="font-family:monospace;font-size:10px;color:#555">${escHtml(p.qrId)}</div>
              <div style="display:flex;align-items:center;justify-content:center;margin:6px 0" class="qr-placeholder" data-part-id="${p.id}">
                <div class="spinner spinner--sm"></div>
              </div>
              <div style="font-family:monospace;font-size:9px;color:#777">${escHtml(p.serialNumber)}</div>
            </div>
          `).join('')}
        </div>
      `,
      actions: [
        { label: 'Tutup', type: 'ghost', id: 'label-close-btn', onClick: () => closeModal() }
      ]
    });

    // Populate QR codes asynchronously
    parts.forEach(async (p) => {
      try {
        const qrRes = await window.api.qrGenerateForPart(p.id);
        const container = document.querySelector(`.qr-placeholder[data-part-id="${p.id}"]`);
        if (container && qrRes.success) {
          container.innerHTML = `<img src="${qrRes.data.dataUrl}" width="80" height="80" style="image-rendering:pixelated" alt="QR">`;
        }
      } catch (_) {}
    });

    document.querySelector('#btn-print-now')?.addEventListener('click', () => {
      window.print();
    });

  } catch (err) {
    toast.error('Gagal', err.message);
  }
}

function renderReportCard(title, description, icon, format, btnId, variant) {
  const btnType = variant === 'primary' ? 'btn--primary'
    : variant === 'ghost' ? 'btn--ghost'
    : 'btn--secondary';

  return `
    <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4);min-height:220px;box-shadow:var(--shadow-sm)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <div style="width:42px;height:42px;background:var(--color-accent-dim);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center">
          <span class="icon" style="color:var(--color-accent)">${icon}</span>
        </div>
        <div>
          <div style="font-size:var(--text-md);font-weight:600">${escHtml(title)}</div>
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${escHtml(format)}</div>
        </div>
      </div>
      <p style="font-size:var(--text-sm);color:var(--color-ink-secondary);line-height:1.6;flex:1;margin:0">${escHtml(description)}</p>
      <button class="btn ${btnType} btn--sm" id="${btnId}">
        <span class="icon icon--sm">${icon === 'qr_code_2' ? 'print' : 'download'}</span>
        ${icon === 'qr_code_2' ? 'Buka Lembar Print' : 'Download Excel'}
      </button>
    </div>
  `;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
