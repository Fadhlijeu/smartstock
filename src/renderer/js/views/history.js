/**
 * history.js - Riwayat Transaksi View.
 */

import { toast } from '../components/toast.js';

let transactions = [];
let filters = { direction: '', dateFrom: '', dateTo: '', search: '' };
let searchTimer = null;

export async function mount(container) {
  container.innerHTML = renderShell();
  bindEvents(container);
  await loadTransactions(container);
}

function renderShell() {
  const today = new Date().toISOString().slice(0, 10);

  return `
    <div class="section-header">
      <div>
        <h2 class="section-title">Riwayat Transaksi</h2>
        <p style="font-size:var(--text-sm);color:var(--color-ink-muted);margin-top:var(--space-1)">
          Audit barang masuk dan keluar dari scanner.
        </p>
      </div>
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn--secondary btn--sm" id="btn-history-refresh">
          <span class="icon icon--sm">refresh</span> Refresh
        </button>
        <button class="btn btn--primary btn--sm" id="btn-history-export">
          <span class="icon icon--sm">download</span> Export
        </button>
      </div>
    </div>

    <div class="grid-controls" style="align-items:center">
      <div class="grid-controls__search">
        <span class="icon">search</span>
        <input type="text" id="history-search" placeholder="Cari deskripsi, serial, QR, invoice..." autocomplete="off">
      </div>
      <div class="toggle" id="history-direction-toggle">
        <button class="toggle__option active" data-direction="">Semua</button>
        <button class="toggle__option" data-direction="IN">IN</button>
        <button class="toggle__option" data-direction="OUT">OUT</button>
      </div>
      <input type="date" class="form-input" id="history-date-from" value="${today}" style="width:auto" title="Dari tanggal">
      <input type="date" class="form-input" id="history-date-to" value="${today}" style="width:auto" title="Sampai tanggal">
      <button class="btn btn--ghost btn--sm" id="btn-history-clear">
        <span class="icon icon--sm">filter_alt_off</span> Reset
      </button>
    </div>

    <div id="history-summary" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3);margin-bottom:var(--space-4)"></div>

    <div id="history-table-container" style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-10)">
        <div class="spinner spinner--lg"></div>
      </div>
    </div>
  `;
}

async function loadTransactions(container) {
  const query = {
    direction: filters.direction || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    search: filters.search || undefined,
    limit: 500,
  };

  try {
    const res = await window.api.getTransactions(query);
    if (!res.success) {
      showError(container, res.error.message);
      return;
    }

    transactions = res.data || [];
    renderSummary(container);
    renderTable(container);
  } catch (err) {
    showError(container, err.message);
  }
}

function renderSummary(container) {
  const totalIn = transactions
    .filter((tx) => tx.direction === 'IN')
    .reduce((sum, tx) => sum + Number(tx.quantity || 0), 0);
  const totalOut = transactions
    .filter((tx) => tx.direction === 'OUT')
    .reduce((sum, tx) => sum + Number(tx.quantity || 0), 0);

  const el = container.querySelector('#history-summary');
  if (!el) return;
  el.innerHTML = `
    ${summaryCard('Transaksi', transactions.length.toLocaleString('id'), 'receipt_long', 'var(--color-accent)')}
    ${summaryCard('Total IN', `+${totalIn.toLocaleString('id')}`, 'login', 'var(--color-status-ok)')}
    ${summaryCard('Total OUT', `-${totalOut.toLocaleString('id')}`, 'logout', 'var(--color-status-out)')}
  `;
}

function summaryCard(label, value, icon, color) {
  return `
    <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-md);padding:var(--space-4);display:flex;align-items:center;gap:var(--space-3)">
      <span class="icon" style="color:${color}">${icon}</span>
      <div>
        <div style="font-size:var(--text-xl);font-weight:700;font-variant-numeric:tabular-nums">${value}</div>
        <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${label}</div>
      </div>
    </div>
  `;
}

function renderTable(container) {
  const tableContainer = container.querySelector('#history-table-container');
  if (!tableContainer) return;

  if (transactions.length === 0) {
    tableContainer.innerHTML = `
      <div class="empty-state" style="padding:var(--space-12)">
        <span class="icon icon--xl">receipt_long</span>
        <h3>Belum ada transaksi</h3>
        <p>Scan IN/OUT akan muncul di sini lengkap dengan stok sebelum dan sesudah.</p>
      </div>
    `;
    return;
  }

  tableContainer.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table" style="min-width:960px">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Barang</th>
            <th>Arah</th>
            <th style="text-align:right">Qty</th>
            <th style="text-align:right">Sebelum</th>
            <th style="text-align:right">Sesudah</th>
            <th>Metode</th>
            <th>Operator</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(renderRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderRow(tx) {
  const isOut = tx.direction === 'OUT';
  const color = isOut ? 'var(--color-status-out)' : 'var(--color-status-ok)';
  const icon = isOut ? 'logout' : 'login';

  return `
    <tr>
      <td>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs)">${formatDateTime(tx.scannedAt)}</div>
      </td>
      <td>
        <div style="font-weight:500">${escHtml(tx.partDescription || tx.partId)}</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink-muted)">
          ${escHtml(tx.qrId)} ${tx.serialNumber ? `- ${escHtml(tx.serialNumber)}` : ''}
        </div>
      </td>
      <td>
        <span class="status-badge" style="color:${color};background:${isOut ? 'var(--color-status-out-dim)' : 'var(--color-status-ok-dim)'}">
          <span class="icon icon--sm">${icon}</span> ${tx.direction}
        </span>
      </td>
      <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:${color}">
        ${isOut ? '-' : '+'}${Number(tx.quantity || 0).toLocaleString('id')}
      </td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${Number(tx.qtyBefore || 0).toLocaleString('id')}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${Number(tx.qtyAfter || 0).toLocaleString('id')}</td>
      <td>${escHtml(tx.scanMethod || '-')}</td>
      <td>${escHtml(tx.operator || '-')}</td>
    </tr>
  `;
}

function bindEvents(container) {
  const from = container.querySelector('#history-date-from');
  const to = container.querySelector('#history-date-to');
  filters.dateFrom = from?.value || '';
  filters.dateTo = to?.value || '';

  container.querySelector('#btn-history-refresh')?.addEventListener('click', () => loadTransactions(container));
  container.querySelector('#btn-history-export')?.addEventListener('click', () => exportHistory());
  container.querySelector('#btn-history-clear')?.addEventListener('click', async () => {
    filters = { direction: '', dateFrom: '', dateTo: '', search: '' };
    container.querySelector('#history-search').value = '';
    container.querySelector('#history-date-from').value = '';
    container.querySelector('#history-date-to').value = '';
    container.querySelectorAll('#history-direction-toggle .toggle__option').forEach((btn) => btn.classList.toggle('active', btn.dataset.direction === ''));
    await loadTransactions(container);
  });

  container.querySelector('#history-search')?.addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      filters.search = event.target.value.trim();
      await loadTransactions(container);
    }, 250);
  });

  container.querySelector('#history-date-from')?.addEventListener('change', async (event) => {
    filters.dateFrom = event.target.value;
    await loadTransactions(container);
  });

  container.querySelector('#history-date-to')?.addEventListener('change', async (event) => {
    filters.dateTo = event.target.value;
    await loadTransactions(container);
  });

  container.querySelector('#history-direction-toggle')?.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-direction]');
    if (!btn) return;
    filters.direction = btn.dataset.direction;
    container.querySelectorAll('#history-direction-toggle .toggle__option').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    await loadTransactions(container);
  });
}

async function exportHistory() {
  const res = await window.api.exportExcel('transactions', {
    direction: filters.direction || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    search: filters.search || undefined,
  });

  if (res.success) {
    toast.success('Export Berhasil', 'Riwayat transaksi disimpan sebagai Excel.');
  } else if (res.error.code !== 'CANCELED') {
    toast.error('Export Gagal', res.error.message);
  }
}

function showError(container, message) {
  const tableContainer = container.querySelector('#history-table-container');
  if (!tableContainer) return;
  tableContainer.innerHTML = `
    <div class="empty-state" style="padding:var(--space-10)">
      <span class="icon icon--xl" style="color:var(--color-error)">error</span>
      <h3>Gagal memuat transaksi</h3>
      <p>${escHtml(message)}</p>
    </div>
  `;
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return value;
  }
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
