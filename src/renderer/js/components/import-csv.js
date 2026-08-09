/**
 * import-csv.js — CSV Import Flow Component
 * Step 1: Pilih file → Step 2: Preview & Error report → Step 3: Konfirmasi insert
 */

import { toast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

/**
 * Buka alur import CSV (modal multi-step)
 * @param {Function} onComplete - callback setelah import berhasil
 */
export async function openImportCSVFlow(onComplete) {
  // ── STEP 1: Pilih file & parse ──────────────────────────────────────────────
  const res = await window.api.importCSV(null); // null = tampilkan file dialog

  if (!res.success) {
    if (res.error.code !== 'CANCELED') {
      toast.error('Import Gagal', res.error.message);
    }
    return;
  }

  const { filePath, totalRows, validRows, errorRows, errors, previewRows, rows } = res.data;
  const fileName = filePath.split(/[\\/]/).pop();

  // ── STEP 2: Tampilkan preview modal ────────────────────────────────────────
  const previewHtml = buildPreviewHtml(fileName, totalRows, validRows, errorRows, errors, previewRows);

  const { close, getEl } = openModal({
    title: 'Preview Import CSV',
    body: previewHtml,
    size: 'wide',
    actions: [
      {
        label: 'Batal',
        type: 'ghost',
        id: 'import-cancel-btn',
        onClick: () => closeModal(),
      },
      {
        label: `Import ${validRows} Barang`,
        type: validRows > 0 ? 'primary' : 'ghost',
        id: 'import-confirm-btn',
        onClick: validRows > 0
          ? () => confirmImport(rows, onComplete)
          : () => {},
      },
    ],
  });

  // Disable confirm button jika tidak ada valid rows
  if (validRows === 0) {
    const btn = document.querySelector('#import-confirm-btn');
    if (btn) btn.disabled = true;
  }
}

/**
 * Eksekusi import setelah konfirmasi
 */
async function confirmImport(rows, onComplete) {
  // Update UI jadi loading
  const confirmBtn = document.querySelector('#import-confirm-btn');
  const cancelBtn = document.querySelector('#import-cancel-btn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<div class="spinner spinner--sm"></div> Mengimport...'; }
  if (cancelBtn) cancelBtn.disabled = true;

  // Progress bar
  const progressContainer = document.querySelector('#import-progress-container');
  if (progressContainer) progressContainer.hidden = false;

  // Subscribe to progress
  const unsubProgress = window.api.onImportProgress((data) => {
    const bar = document.querySelector('#import-progress-bar');
    const txt = document.querySelector('#import-progress-text');
    if (bar) bar.style.width = `${data.percent}%`;
    if (txt) txt.textContent = `${data.current} / ${data.total} barang...`;
  });

  try {
    const res = await window.api.importConfirm(rows);
    unsubProgress();
    closeModal();

    if (res.success) {
      const { inserted, duplicates, failed } = res.data;

      let msg = `${inserted} barang berhasil diimport`;
      if (duplicates.length > 0) msg += `, ${duplicates.length} duplikat dilewati`;
      if (failed.length > 0) msg += `, ${failed.length} gagal`;

      if (failed.length > 0) {
        toast.warning('Import Selesai (ada gagal)', msg, 6000);
      } else if (duplicates.length > 0) {
        toast.info('Import Selesai', msg);
      } else {
        toast.success('Import Berhasil', msg);
      }

      if (typeof onComplete === 'function') onComplete({ inserted, duplicates, failed });
    } else {
      toast.error('Import Gagal', res.error.message);
    }
  } catch (err) {
    unsubProgress();
    closeModal();
    toast.error('Import Error', err.message);
  }
}

/**
 * Build preview modal HTML
 */
function buildPreviewHtml(fileName, totalRows, validRows, errorRows, errors, previewRows) {
  const statusColor = errorRows === 0 ? 'var(--color-status-ok)' : 'var(--color-status-low)';

  return `
    <!-- Summary strip -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-5)">
      ${summaryChip('Total Baris', totalRows, 'table_rows', '')}
      ${summaryChip('Siap Import', validRows, 'check_circle', 'ok')}
      ${summaryChip('Ada Error', errorRows, 'cancel', errorRows > 0 ? 'out' : 'ok')}
    </div>

    <!-- File info -->
    <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--color-paper-base);border-radius:var(--radius-md);margin-bottom:var(--space-5)">
      <span class="icon" style="color:var(--color-accent)">description</span>
      <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-ink-secondary)">${escHtml(fileName)}</span>
    </div>

    <!-- Progress bar (hidden saat belum import) -->
    <div id="import-progress-container" hidden style="margin-bottom:var(--space-4)">
      <div style="height:4px;background:var(--color-paper-border);border-radius:var(--radius-full);overflow:hidden;margin-bottom:var(--space-2)">
        <div id="import-progress-bar" style="height:100%;width:0%;background:var(--color-accent);transition:width 0.2s;border-radius:var(--radius-full)"></div>
      </div>
      <div id="import-progress-text" style="font-size:var(--text-xs);color:var(--color-ink-muted);text-align:center"></div>
    </div>

    ${previewRows.length > 0 ? `
      <!-- Preview table -->
      <div style="font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-ink-muted);margin-bottom:var(--space-2)">
        Preview ${Math.min(previewRows.length, 5)} Baris Pertama
      </div>
      <div style="overflow-x:auto;margin-bottom:var(--space-5);border:1px solid var(--color-paper-border);border-radius:var(--radius-md)">
        <table class="data-table" style="min-width:600px">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>MR Invoice</th>
              <th>Deskripsi</th>
              <th>Serial</th>
              <th>Qty</th>
              <th>Kategori</th>
            </tr>
          </thead>
          <tbody>
            ${previewRows.slice(0, 5).map((r) => `
              <tr>
                <td>${escHtml(r.dateEntry)}</td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${escHtml(r.mrInvoice)}</td>
                <td>${escHtml(r.description)}</td>
                <td style="font-family:var(--font-mono);font-size:var(--text-xs)">${escHtml(r.serialNumber)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums">${r.initialQty} ${escHtml(r.unit)}</td>
                <td><span class="chip">${escHtml(r.category)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${errors.length > 0 ? `
      <!-- Error report -->
      <details style="margin-bottom:var(--space-4)">
        <summary style="cursor:pointer;padding:var(--space-2) 0;font-size:var(--text-sm);font-weight:600;color:var(--color-status-out);user-select:none">
          <span class="icon icon--sm" style="vertical-align:middle">warning</span>
          ${errorRows} baris dengan error — klik untuk lihat detail
        </summary>
        <div style="margin-top:var(--space-3);max-height:200px;overflow-y:auto;background:var(--color-paper-base);border-radius:var(--radius-md);padding:var(--space-3)">
          ${errors.slice(0, 50).map((e) => `
            <div style="padding:var(--space-2) 0;border-bottom:1px solid var(--color-paper-divider)">
              <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-status-out)">Baris ${e.row}</span>
              ${e.serialNumber ? `<span style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-left:var(--space-2)">[${escHtml(e.serialNumber)}]</span>` : ''}
              <ul style="margin:4px 0 0 var(--space-4);padding:0">
                ${e.errors.map((msg) => `<li style="font-size:var(--text-xs);color:var(--color-ink-secondary)">${escHtml(msg)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
          ${errors.length > 50 ? `<div style="font-size:var(--text-xs);color:var(--color-ink-muted);padding-top:var(--space-2)">... dan ${errors.length - 50} error lainnya</div>` : ''}
        </div>
      </details>
    ` : ''}

    ${validRows === 0 ? `
      <div class="empty-state" style="padding:var(--space-6)">
        <span class="icon icon--xl" style="color:var(--color-status-out)">cancel</span>
        <h3>Tidak ada baris valid untuk diimport</h3>
        <p>Perbaiki error di file CSV, lalu coba lagi. Download template untuk format yang benar.</p>
      </div>
    ` : `
      <div style="padding:var(--space-3) var(--space-4);background:var(--color-accent-glow);border:1px solid var(--color-accent-dim);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-ink-secondary)">
        <span class="icon icon--sm" style="color:var(--color-accent);vertical-align:middle">info</span>
        Klik <strong>Import ${validRows} Barang</strong> untuk melanjutkan.
        ${errorRows > 0 ? `${errorRows} baris bermasalah akan <strong>dilewati</strong>.` : ''}
      </div>
    `}
  `;
}

function summaryChip(label, value, icon, variant) {
  const color = variant === 'ok' ? 'var(--color-status-ok)'
    : variant === 'out' && value > 0 ? 'var(--color-status-out)'
    : 'var(--color-ink-secondary)';
  return `
    <div style="background:var(--color-paper-base);border:1px solid var(--color-paper-border);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);text-align:center">
      <div style="font-size:var(--text-2xl);font-weight:700;color:${color};font-variant-numeric:tabular-nums">${value}</div>
      <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${label}</div>
    </div>
  `;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
