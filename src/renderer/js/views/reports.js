/**
 * reports.js - Laporan & Export View.
 */

import { toast } from '../components/toast.js';

export async function mount(container) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Laporan & Export</h2>
        <p style="font-size:var(--text-sm);color:var(--color-ink-muted);margin-top:var(--space-1)">
          Export workbook Excel untuk stok, transaksi, dan reorder.
        </p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-4)">
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
        'Daftar barang LOW untuk kebutuhan reorder atau investigasi stok.',
        'warning',
        'Excel (.xlsx)',
        'btn-low-stock',
        'secondary'
      )}
      ${renderReportCard(
        'QR Labels',
        'Sheet label QR untuk print fisik barang.',
        'qr_code_2',
        'PDF label',
        'btn-qr-labels',
        'ghost'
      )}
    </div>

    <div style="margin-top:var(--space-6);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
      <div style="padding:var(--space-5);background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg)">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
          <span class="icon" style="color:var(--color-status-ok)">check_circle</span>
          <span style="font-size:var(--text-md);font-weight:600">Export Excel Aktif</span>
        </div>
        <p style="font-size:var(--text-sm);color:var(--color-ink-muted);line-height:1.7;margin:0">
          Workbook dibuat lokal lewat main process, lalu folder hasil akan dibuka otomatis.
        </p>
      </div>
      <div style="padding:var(--space-5);background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg)">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
          <span class="icon" style="color:var(--color-status-low)">pending</span>
          <span style="font-size:var(--text-md);font-weight:600">PDF Label Berikutnya</span>
        </div>
        <p style="font-size:var(--text-sm);color:var(--color-ink-muted);line-height:1.7;margin:0">
          QR per barang sudah bisa dibuat dari layar Barang. Layout PDF batch label masih perlu service khusus.
        </p>
      </div>
    </div>
  `;

  bindEvents(container);
}

function bindEvents(container) {
  container.querySelector('#btn-stock-snapshot')?.addEventListener('click', () => runExport('stock', 'Stock Snapshot'));
  container.querySelector('#btn-tx-log')?.addEventListener('click', () => runExport('transactions', 'Transaction Log'));
  container.querySelector('#btn-low-stock')?.addEventListener('click', () => runExport('lowStock', 'Low Stock Alert'));
  container.querySelector('#btn-qr-labels')?.addEventListener('click', () => {
    toast.info('PDF Label Belum Aktif', 'Gunakan tombol QR di layar Barang untuk melihat dan menyimpan QR per item.');
  });
}

async function runExport(type, label) {
  const res = await window.api.exportExcel(type, {});
  if (res.success) {
    toast.success('Export Berhasil', `${label} disimpan sebagai Excel.`);
  } else if (res.error.code !== 'CANCELED') {
    toast.error('Export Gagal', res.error.message);
  }
}

function renderReportCard(title, description, icon, format, btnId, variant) {
  const btnType = variant === 'primary' ? 'btn--primary'
    : variant === 'ghost' ? 'btn--ghost'
    : 'btn--secondary';
  const disabled = variant === 'ghost' ? 'aria-disabled="true"' : '';

  return `
    <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4);min-height:220px">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <div style="width:40px;height:40px;background:var(--color-accent-dim);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center">
          <span class="icon" style="color:var(--color-accent)">${icon}</span>
        </div>
        <div>
          <div style="font-size:var(--text-md);font-weight:600">${escHtml(title)}</div>
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${escHtml(format)}</div>
        </div>
      </div>
      <p style="font-size:var(--text-sm);color:var(--color-ink-secondary);line-height:1.6;flex:1;margin:0">${escHtml(description)}</p>
      <button class="btn ${btnType} btn--sm" id="${btnId}" ${disabled}>
        <span class="icon icon--sm">${variant === 'ghost' ? 'pending' : 'download'}</span>
        ${variant === 'ghost' ? 'Belum tersedia' : 'Export'}
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
