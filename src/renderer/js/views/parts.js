/**
 * parts.js — Manajemen Barang View (M1 Full Implementation)
 * Fitur: Tabel barang, form tambah, form edit, hapus, import CSV
 */

import { toast } from '../components/toast.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { renderPartForm, submitPartForm } from '../components/part-form.js';
import { openImportCSVFlow } from '../components/import-csv.js';
import { openQRModal } from '../components/qr-modal.js';

let allParts = [];
let filteredParts = [];
let currentSort = { col: 'created_at', dir: 'DESC' };
let searchDebounce = null;

export async function mount(container) {
  container.innerHTML = renderShell();
  await loadAndRender(container);
  bindEvents(container);
}

// ─── SHELL ────────────────────────────────────────────────────────────────────

function renderShell() {
  return `
    <!-- Header -->
    <div class="section-header">
      <h2 class="section-title">Manajemen Barang</h2>
      <div style="display:flex;gap:var(--space-2);align-items:center">
        <button class="btn btn--ghost btn--sm" id="btn-download-template" title="Download template CSV">
          <span class="icon icon--sm">download</span> Template
        </button>
        <button class="btn btn--secondary btn--sm" id="btn-import-csv">
          <span class="icon icon--sm">upload</span> Import CSV
        </button>
        <div class="divider--vertical" style="height:24px"></div>
        <button class="btn btn--primary btn--sm" id="btn-add-part">
          <span class="icon icon--sm">add</span> Tambah Barang
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="grid-controls" id="parts-controls">
      <div class="grid-controls__search">
        <span class="icon">search</span>
        <input type="text" id="parts-search" placeholder="Cari nama, serial, invoice..." autocomplete="off">
      </div>

      <select class="form-select" id="filter-status" style="height:32px;width:auto">
        <option value="">Semua Status</option>
        <option value="OK">✅ OK</option>
        <option value="LOW">⚠️ Stok Rendah</option>
        <option value="OUT">🔴 Habis</option>
        <option value="REVIEW">📋 Perlu Review</option>
      </select>

      <select class="form-select" id="filter-category" style="height:32px;width:auto">
        <option value="">Semua Kategori</option>
      </select>

      <span id="parts-count" style="font-size:var(--text-sm);color:var(--color-ink-muted);white-space:nowrap;padding:0 var(--space-1)">
        — barang
      </span>
    </div>

    <!-- Table -->
    <div id="parts-table-container" style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-10)">
        <div class="spinner spinner--lg"></div>
      </div>
    </div>
  `;
}

// ─── DATA LOADING ─────────────────────────────────────────────────────────────

async function loadAndRender(container) {
  try {
    const res = await window.api.getParts({ sortBy: currentSort.col, sortDir: currentSort.dir });
    if (!res.success) {
      showTableError(container, res.error.message);
      return;
    }
    allParts = res.data;
    filteredParts = [...allParts];

    // Populate category filter
    populateCategoryFilter(container);
    renderTable(container);
    updateCount(container);
  } catch (err) {
    showTableError(container, err.message);
  }
}

function populateCategoryFilter(container) {
  const sel = container.querySelector('#filter-category');
  if (!sel) return;
  const cats = [...new Set(allParts.map((p) => p.category).filter(Boolean))].sort();
  cats.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
}

// ─── TABLE RENDER ─────────────────────────────────────────────────────────────

function renderTable(container) {
  const tableContainer = container.querySelector('#parts-table-container');
  if (!tableContainer) return;

  if (filteredParts.length === 0) {
    tableContainer.innerHTML = `
      <div class="empty-state" style="padding:var(--space-12)">
        <span class="icon icon--2xl">inventory_2</span>
        <h3>${allParts.length === 0 ? 'Belum ada barang' : 'Tidak ada hasil'}</h3>
        <p>${allParts.length === 0
          ? 'Tambah barang baru atau import dari CSV.'
          : 'Coba ubah filter atau kata kunci pencarian.'}</p>
        ${allParts.length === 0 ? `
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
            <button class="btn btn--secondary" id="btn-empty-import">
              <span class="icon icon--sm">upload</span> Import CSV
            </button>
            <button class="btn btn--primary" id="btn-empty-add">
              <span class="icon icon--sm">add</span> Tambah Barang
            </button>
          </div>` : ''}
      </div>
    `;
    return;
  }

  const sortIcon = (col) => {
    if (currentSort.col !== col) return '<span class="icon icon--xs" style="opacity:0.3">unfold_more</span>';
    return currentSort.dir === 'ASC'
      ? '<span class="icon icon--xs">arrow_upward</span>'
      : '<span class="icon icon--xs">arrow_downward</span>';
  };

  tableContainer.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table" id="parts-table" style="min-width:900px">
        <thead>
          <tr>
            <th data-sort="description" style="min-width:200px">
              Deskripsi ${sortIcon('description')}
            </th>
            <th data-sort="serial_number" style="min-width:140px">
              Serial Number ${sortIcon('serial_number')}
            </th>
            <th data-sort="category">Kategori ${sortIcon('category')}</th>
            <th data-sort="current_qty" style="text-align:right">
              Qty ${sortIcon('current_qty')}
            </th>
            <th>Status</th>
            <th data-sort="date_entry">Tgl Masuk ${sortIcon('date_entry')}</th>
            <th data-sort="mr_invoice">MR Invoice ${sortIcon('mr_invoice')}</th>
            <th style="width:100px;text-align:right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${filteredParts.map(renderRow).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderRow(part) {
  const status = part.status || 'OK';
  const statusClass = status.toLowerCase();

  return `
    <tr data-part-id="${part.id}">
      <td>
        <div style="font-weight:500;line-height:1.3">${escHtml(part.description)}</div>
        <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink-muted)">${escHtml(part.qrId)}</div>
      </td>
      <td>
        <span style="font-family:var(--font-mono);font-size:var(--text-xs)">${escHtml(part.serialNumber)}</span>
      </td>
      <td>
        <span class="chip">${escHtml(part.category || 'Uncategorized')}</span>
      </td>
      <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600">
        ${(part.currentQty ?? 0).toLocaleString('id')}
        <span style="font-size:var(--text-xs);color:var(--color-ink-muted);font-weight:400"> ${escHtml(part.unit)}</span>
      </td>
      <td>
        <span class="status-badge status-badge--${statusClass}">${status}</span>
      </td>
      <td style="font-size:var(--text-sm);color:var(--color-ink-secondary)">${escHtml(part.dateEntry)}</td>
      <td style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink-muted)">${escHtml(part.mrInvoice)}</td>
      <td>
        <div style="display:flex;gap:var(--space-1);justify-content:flex-end">
          <button class="btn btn--ghost btn--icon btn--sm btn-qr-part" data-part-id="${part.id}" title="Lihat QR">
            <span class="icon icon--sm">qr_code</span>
          </button>
          <button class="btn btn--ghost btn--icon btn--sm btn-edit-part" data-part-id="${part.id}" title="Edit">
            <span class="icon icon--sm">edit</span>
          </button>
          <button class="btn btn--ghost btn--icon btn--sm btn-delete-part" data-part-id="${part.id}" title="Hapus">
            <span class="icon icon--sm" style="color:var(--color-status-out)">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function updateCount(container) {
  const el = container.querySelector('#parts-count');
  if (el) el.textContent = `${filteredParts.length.toLocaleString('id')} barang`;
}

function showTableError(container, msg) {
  const tc = container.querySelector('#parts-table-container');
  if (tc) tc.innerHTML = `
    <div class="empty-state">
      <span class="icon icon--xl" style="color:var(--color-error)">error</span>
      <h3>Gagal memuat data</h3>
      <p>${escHtml(msg)}</p>
    </div>
  `;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

function bindEvents(container) {
  // Tambah barang
  const bindAdd = (btn) => btn?.addEventListener('click', () => openPartForm(null, container));
  bindAdd(container.querySelector('#btn-add-part'));

  // Import CSV
  container.querySelector('#btn-import-csv')?.addEventListener('click', async () => {
    await openImportCSVFlow(async () => {
      await loadAndRender(container);
    });
  });

  // Download template
  container.querySelector('#btn-download-template')?.addEventListener('click', async () => {
    const res = await window.api.downloadCSVTemplate();
    if (!res.success && res.error.code !== 'CANCELED') {
      toast.error('Gagal', res.error.message);
    }
  });

  // Search
  container.querySelector('#parts-search')?.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => applyFilters(container), 280);
  });

  // Filters
  container.querySelector('#filter-status')?.addEventListener('change', () => applyFilters(container));
  container.querySelector('#filter-category')?.addEventListener('change', () => applyFilters(container));

  // Table sort + edit + delete (event delegation)
  container.addEventListener('click', (e) => {
    // Sort
    const th = e.target.closest('th[data-sort]');
    if (th) {
      const col = th.dataset.sort;
      if (currentSort.col === col) {
        currentSort.dir = currentSort.dir === 'ASC' ? 'DESC' : 'ASC';
      } else {
        currentSort.col = col;
        currentSort.dir = 'ASC';
      }
      sortFiltered();
      renderTable(container);
      return;
    }

    // QR
    const qrBtn = e.target.closest('.btn-qr-part');
    if (qrBtn) {
      const p = allParts.find((x) => x.id === qrBtn.dataset.partId);
      if (p) openQRModal(p);
      return;
    }

    // Edit
    const editBtn = e.target.closest('.btn-edit-part');
    if (editBtn) {
      openPartForm(editBtn.dataset.partId, container);
      return;
    }

    // Delete
    const delBtn = e.target.closest('.btn-delete-part');
    if (delBtn) {
      handleDelete(delBtn.dataset.partId, container);
      return;
    }

    // Empty state buttons
    if (e.target.closest('#btn-empty-add')) openPartForm(null, container);
    if (e.target.closest('#btn-empty-import')) {
      openImportCSVFlow(async () => { await loadAndRender(container); });
    }

    // Row click → detail (kecuali kena tombol)
    const row = e.target.closest('tr[data-part-id]');
    if (row && !e.target.closest('button')) {
      openPartDetail(row.dataset.partId);
    }
  });
}

// ─── FILTER & SORT ────────────────────────────────────────────────────────────

function applyFilters(container) {
  const search = (container.querySelector('#parts-search')?.value || '').toLowerCase();
  const status = container.querySelector('#filter-status')?.value || '';
  const category = container.querySelector('#filter-category')?.value || '';

  filteredParts = allParts.filter((p) => {
    if (search && ![p.description, p.serialNumber, p.mrInvoice, p.qrId, p.purchaseOrder]
        .some((f) => (f || '').toLowerCase().includes(search))) return false;
    if (status && p.status !== status) return false;
    if (category && p.category !== category) return false;
    return true;
  });

  sortFiltered();
  renderTable(container);
  updateCount(container);
}

function sortFiltered() {
  const { col, dir } = currentSort;
  const colMap = {
    description: 'description', serial_number: 'serialNumber',
    current_qty: 'currentQty', date_entry: 'dateEntry',
    category: 'category', mr_invoice: 'mrInvoice', created_at: 'createdAt',
  };
  const key = colMap[col] || 'createdAt';
  const mult = dir === 'ASC' ? 1 : -1;

  filteredParts.sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (typeof av === 'number') return (av - bv) * mult;
    return String(av).localeCompare(String(bv), 'id') * mult;
  });
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

async function openPartForm(partId, container) {
  const isEdit = !!partId;
  let part = null;

  if (isEdit) {
    const res = await window.api.getPartById(partId);
    if (!res.success) { toast.error('Error', res.error.message); return; }
    part = res.data;
  }

  openModal({
    title: isEdit ? `Edit: ${part.description}` : 'Tambah Barang Baru',
    body: `
      ${renderPartForm(part)}
      <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
        <button class="btn btn--primary" id="modal-submit-btn" style="flex:1">
          ${isEdit ? 'Simpan Perubahan' : 'Tambah Barang'}
        </button>
      </div>
    `,
    size: 'wide',
    actions: [],
    onClose: () => {},
  });

  // Bind submit
  const submitBtn = document.querySelector('#modal-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const form = document.querySelector('#part-form');
      if (!form) return;
      await submitPartForm(form, partId, async (savedPart) => {
        closeModal();
        await loadAndRender(container);
      });
    });
  }

  // Enter key submit
  const form = document.querySelector('#part-form');
  if (form) {
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        submitBtn?.click();
      }
    });
  }
}

async function openPartDetail(partId) {
  const res = await window.api.getPartById(partId);
  if (!res.success) { toast.error('Error', res.error.message); return; }
  const part = res.data;
  const status = part.status || 'OK';

  openModal({
    title: part.description,
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)">
        ${detailRow('Status', `<span class="status-badge status-badge--${status.toLowerCase()}">${status}</span>`, true)}
        ${detailRow('QR ID', `<span style="font-family:var(--font-mono);font-size:var(--text-sm)">${part.qrId || '—'}</span>`, true)}
        ${detailRow('Tanggal Masuk', part.dateEntry)}
        ${detailRow('MR Invoice', part.mrInvoice)}
        ${detailRow('Purchase Order', part.purchaseOrder)}
        ${detailRow('Serial Number', `<span style="font-family:var(--font-mono);font-size:var(--text-sm)">${part.serialNumber}</span>`, true)}
        ${detailRow('Deskripsi', part.description)}
        ${detailRow('Kategori', `<span class="chip">${escHtml(part.category)}</span>`, true)}
      </div>
      <div style="height:1px;background:var(--color-paper-border);margin:var(--space-5) 0"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);text-align:center">
        ${kpiBlock(part.currentQty, 'Stok Saat Ini', '')}
        ${kpiBlock(part.initialQty, 'Stok Awal', 'muted')}
        ${kpiBlock(part.minQty, 'Min. Qty', 'warning')}
      </div>
    `,
    size: 'wide',
    actions: [
      { label: 'Edit', type: 'secondary', id: 'detail-edit-btn', onClick: () => { closeModal(); /* Edit akan dibuka oleh container event */ } },
      { label: 'Tutup', type: 'ghost', id: 'detail-close-btn', onClick: () => closeModal() },
    ],
  });

  document.querySelector('#detail-edit-btn')?.addEventListener('click', async () => {
    closeModal();
    // Kita perlu akses container, workaround: navigasi ke parts dan buka edit
    // Ini diselesaikan lebih baik di M4 dengan proper state management
    const container = document.getElementById('page-content');
    await openPartForm(partId, container);
  });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function handleDelete(partId, container) {
  const part = allParts.find((p) => p.id === partId);
  const confirmed = await confirmDialog(
    'Hapus Barang',
    `Yakin ingin menghapus "${part?.description || partId}"?\nData tidak benar-benar dihapus (soft delete).`,
    { confirmLabel: 'Ya, Hapus', danger: true }
  );

  if (!confirmed) return;

  const res = await window.api.deletePart(partId);
  if (res.success) {
    toast.success('Barang Dihapus', `${part?.description} berhasil dihapus`);
    await loadAndRender(container);
  } else {
    toast.error('Gagal Hapus', res.error.message);
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function detailRow(label, value, isHtml = false) {
  return `
    <div>
      <div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.08em;color:var(--color-ink-muted);margin-bottom:4px">${label}</div>
      <div style="font-size:var(--text-md)">${isHtml ? value : escHtml(String(value || '—'))}</div>
    </div>
  `;
}

function kpiBlock(value, label, variant) {
  const color = variant === 'muted' ? 'var(--color-ink-muted)'
    : variant === 'warning' ? 'var(--color-status-low)'
    : 'var(--color-ink-primary)';
  return `
    <div>
      <div style="font-size:var(--text-2xl);font-weight:700;font-variant-numeric:tabular-nums;color:${color}">${(value ?? 0).toLocaleString('id')}</div>
      <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">${label}</div>
    </div>
  `;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
