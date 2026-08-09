/**
 * reports.js — Laporan & Export View (M0 placeholder, diimplementasi di M5)
 */

import { toast } from '../components/toast.js';

export async function mount(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Laporan & Export</h2>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-4)">
      ${renderReportCard(
        'Stock Snapshot',
        'Laporan stok barang saat ini — semua SKU dengan jumlah terkini, status, dan kategori.',
        'table_chart',
        'Excel (.xlsx)',
        'btn-stock-snapshot'
      )}
      ${renderReportCard(
        'Transaction Log',
        'Log semua transaksi IN/OUT dalam range tanggal tertentu dengan detail operator.',
        'receipt_long',
        'Excel (.xlsx)',
        'btn-tx-log'
      )}
      ${renderReportCard(
        'QR Labels',
        'Generate PDF label QR untuk dicetak — pilih barang, ukuran label, dan jumlah copy.',
        'qr_code_2',
        'PDF (.pdf)',
        'btn-qr-labels'
      )}
      ${renderReportCard(
        'Low Stock Alert',
        'Daftar barang yang stoknya di bawah threshold minimum — untuk reorder.',
        'warning',
        'Excel (.xlsx)',
        'btn-low-stock'
      )}
    </div>

    <div style="margin-top:var(--space-8);padding:var(--space-6);background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg)">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
        <span class="icon icon--lg" style="color:var(--color-accent)">info</span>
        <span style="font-size:var(--text-md);font-weight:600">Milestone 5</span>
      </div>
      <p style="font-size:var(--text-sm);color:var(--color-ink-muted);line-height:1.7">
        Export Excel dan PDF akan diimplementasi di <strong>Milestone 5</strong> menggunakan:<br>
        ExcelJS (styling penuh) · jsPDF (QR label sheet) · Filter tanggal dan kategori
      </p>
    </div>
  `;

  // Bind buttons
  ['btn-stock-snapshot', 'btn-tx-log', 'btn-qr-labels', 'btn-low-stock'].forEach((id) => {
    const btn = container.querySelector(`#${id}`);
    if (btn) btn.addEventListener('click', () => {
      toast.info('Coming Soon', 'Export akan tersedia di Milestone 5');
    });
  });
}

function renderReportCard(title, description, icon, format, btnId) {
  return `
    <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <div style="width:40px;height:40px;background:var(--color-accent-dim);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center">
          <span class="icon" style="color:var(--color-accent)">${icon}</span>
        </div>
        <div>
          <div style="font-size:var(--text-md);font-weight:600">${title}</div>
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${format}</div>
        </div>
      </div>
      <p style="font-size:var(--text-sm);color:var(--color-ink-secondary);line-height:1.6;flex:1">${description}</p>
      <button class="btn btn--secondary btn--sm" id="${btnId}">
        <span class="icon icon--sm">download</span> Export
      </button>
    </div>
  `;
}
