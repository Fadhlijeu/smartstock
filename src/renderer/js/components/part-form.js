/**
 * part-form.js — Form Tambah/Edit Barang untuk SAP StockMon
 * Mendukung mode: 'create' | 'edit'
 * Validasi client-side sebelum kirim ke IPC.
 */

import { toast } from '../components/toast.js';

// Kategori dari database (dari seed 001_initial.sql)
const CATEGORY_OPTIONS = [
  'Uncategorized',
  'Mechanical/Fastener',
  'Mechanical/Bearing',
  'Mechanical/Seal & Gasket',
  'Mechanical/Coupling',
  'Electrical/Motor',
  'Electrical/Cable & Wiring',
  'Electrical/Panel & Control',
  'Electrical/Sensor & Instrument',
  'Fluid/Pipe & Fitting',
  'Fluid/Pump',
  'Fluid/Valve',
  'Consumable/Lubricant & Oil',
  'Consumable/Cleaning',
  'Consumable/PPE',
  'Safety/Fire Protection',
  'Safety/Signage',
  'Tool/Hand Tool',
  'Tool/Power Tool',
];

const UNIT_OPTIONS = [
  'pcs', 'meter', 'kg', 'set', 'liter',
  'box', 'roll', 'batang', 'lembar', 'unit', 'buah', 'pak', 'pasang',
];

/**
 * Render form HTML
 * @param {Object|null} part - null = create mode, Object = edit mode
 * @returns {string} HTML string
 */
export function renderPartForm(part = null) {
  const isEdit = !!part;
  const today = new Date().toISOString().slice(0, 10);

  const val = (field, fallback = '') => part ? (part[field] ?? fallback) : fallback;

  const categoryOpts = CATEGORY_OPTIONS.map((c) =>
    `<option value="${c}" ${val('category', 'Uncategorized') === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  const unitOpts = UNIT_OPTIONS.map((u) =>
    `<option value="${u}" ${val('unit', 'pcs') === u ? 'selected' : ''}>${u}</option>`
  ).join('');

  return `
    <form id="part-form" novalidate autocomplete="off">

      <!-- Row 1: Date + MR Invoice + PO -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)">

        <div class="form-group" style="margin-bottom:0">
          <label class="form-label required" for="pf-date-entry">Tanggal Masuk</label>
          <input type="date" class="form-input" id="pf-date-entry" name="dateEntry"
            value="${val('dateEntry', today)}" required>
          <span class="form-error" id="err-dateEntry" hidden></span>
        </div>

        <div class="form-group" style="margin-bottom:0">
          <label class="form-label required" for="pf-mr-invoice">MR Invoice</label>
          <input type="text" class="form-input" id="pf-mr-invoice" name="mrInvoice"
            value="${val('mrInvoice')}" placeholder="INV-2026-0001" required>
          <span class="form-error" id="err-mrInvoice" hidden></span>
        </div>

        <div class="form-group" style="margin-bottom:0">
          <label class="form-label required" for="pf-po">Purchase Order</label>
          <input type="text" class="form-input" id="pf-po" name="purchaseOrder"
            value="${val('purchaseOrder')}" placeholder="PO-2026-0001" required>
          <span class="form-error" id="err-purchaseOrder" hidden></span>
        </div>

      </div>

      <!-- Row 2: Description -->
      <div class="form-group">
        <label class="form-label required" for="pf-desc">Deskripsi Barang</label>
        <input type="text" class="form-input" id="pf-desc" name="description"
          value="${val('description')}" placeholder="Nama barang lengkap, e.g. Baut M10 x 25mm SS304" required>
        <span class="form-error" id="err-description" hidden></span>
      </div>

      <!-- Row 3: Serial + Category -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">

        <div class="form-group">
          <label class="form-label" for="pf-serial">Serial Number</label>
          <input type="text" class="form-input form-input--mono" id="pf-serial" name="serialNumber"
            value="${val('serialNumber')}" placeholder="BOLT-M10-001"
            ${isEdit ? 'readonly title="Serial number tidak bisa diubah setelah dibuat"' : ''}>
          <span class="form-hint">${isEdit ? 'Tidak dapat diubah setelah dibuat' : 'Kosongkan untuk auto-generate'}</span>
          <span class="form-error" id="err-serialNumber" hidden></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-category">Kategori</label>
          <select class="form-select" id="pf-category" name="category">
            ${categoryOpts}
          </select>
        </div>

      </div>

      <!-- Row 4: Qty + Unit + Min Qty -->
      <div style="display:grid;grid-template-columns:1fr 120px 1fr;gap:var(--space-4)">

        <div class="form-group">
          <label class="form-label required" for="pf-qty">${isEdit ? 'Stok Saat Ini' : 'Jumlah Awal (Qty)'}</label>
          <input type="number" class="form-input" id="pf-qty" name="${isEdit ? 'currentQty' : 'initialQty'}"
            value="${isEdit ? val('currentQty', 0) : val('initialQty', 0)}"
            min="0" step="1" required>
          <span class="form-error" id="err-qty" hidden></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-unit">Unit</label>
          <select class="form-select" id="pf-unit" name="unit">
            ${unitOpts}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-min-qty">
            Min. Qty
            <span class="form-hint" style="display:inline;margin-left:var(--space-1)">(threshold LOW)</span>
          </label>
          <input type="number" class="form-input" id="pf-min-qty" name="minQty"
            value="${val('minQty', 0)}" min="0" step="1">
        </div>

      </div>

      <!-- Status indicator (edit mode only) -->
      ${isEdit ? `
        <div style="padding:var(--space-3) var(--space-4);background:var(--color-paper-base);border:1px solid var(--color-paper-border);border-radius:var(--radius-md);margin-bottom:var(--space-4)">
          <div style="display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap">
            <div>
              <div style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-bottom:2px">QR ID</div>
              <div style="font-family:var(--font-mono);font-size:var(--text-sm)">${val('qrId', '—')}</div>
            </div>
            <div>
              <div style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-bottom:2px">Status</div>
              <span class="status-badge status-badge--${(val('status', 'ok')).toLowerCase()}">${val('status', 'OK')}</span>
            </div>
            <div>
              <div style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-bottom:2px">Dibuat</div>
              <div style="font-size:var(--text-sm)">${formatDate(val('createdAt'))}</div>
            </div>
          </div>
        </div>
      ` : ''}

    </form>
  `;
}

/**
 * Validasi form dan return data atau null jika invalid
 * @param {HTMLFormElement} form
 * @param {boolean} isEdit
 * @returns {Object|null}
 */
export function validatePartForm(form, isEdit = false) {
  let valid = true;

  // Clear semua errors dulu
  form.querySelectorAll('.form-error').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
  form.querySelectorAll('.form-input, .form-select').forEach((el) => {
    el.classList.remove('error');
  });

  const show = (fieldId, msg) => {
    const errEl = form.querySelector(`#err-${fieldId}`);
    const inputEl = form.querySelector(`[name="${fieldId}"]`);
    if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
    if (inputEl) inputEl.classList.add('error');
    valid = false;
  };

  const g = (name) => (form.querySelector(`[name="${name}"]`)?.value || '').trim();

  // Required fields
  if (!g('dateEntry')) show('dateEntry', 'Tanggal masuk wajib diisi');
  if (!g('mrInvoice')) show('mrInvoice', 'MR Invoice wajib diisi');
  if (!g('purchaseOrder')) show('purchaseOrder', 'Purchase Order wajib diisi');
  if (!g('description')) show('description', 'Deskripsi barang wajib diisi');

  // Date format
  const dateVal = g('dateEntry');
  if (dateVal && !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    show('dateEntry', 'Format tanggal harus YYYY-MM-DD');
  }

  // Qty
  const qtyField = isEdit ? 'currentQty' : 'initialQty';
  const qtyVal = parseInt(form.querySelector(`[name="${qtyField}"]`)?.value || '0');
  if (isNaN(qtyVal) || qtyVal < 0) {
    show('qty', 'Jumlah harus angka positif');
  }

  if (!valid) return null;

  // Build data object
  const data = {
    dateEntry: g('dateEntry'),
    mrInvoice: g('mrInvoice'),
    purchaseOrder: g('purchaseOrder'),
    description: g('description'),
    category: g('category') || 'Uncategorized',
    unit: g('unit') || 'pcs',
    minQty: parseInt(form.querySelector('[name="minQty"]')?.value || '0') || 0,
  };

  if (isEdit) {
    data.currentQty = qtyVal;
  } else {
    data.serialNumber = g('serialNumber');
    data.initialQty = qtyVal;
  }

  return data;
}

/**
 * Submit handler — create atau update
 * @param {HTMLFormElement} form
 * @param {string|null} partId - null = create
 * @param {Function} onSuccess - dipanggil dengan part data
 */
export async function submitPartForm(form, partId = null, onSuccess) {
  const isEdit = !!partId;
  const data = validatePartForm(form, isEdit);
  if (!data) return;

  // Disable submit button
  const submitBtn = form.closest('[id]')?.querySelector('#modal-submit-btn') ||
                    document.querySelector('#modal-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner spinner--sm"></div> Menyimpan...';
  }

  try {
    let res;
    if (isEdit) {
      res = await window.api.updatePart(partId, data);
    } else {
      res = await window.api.createPart(data);
    }

    if (res.success) {
      toast.success(
        isEdit ? 'Barang Diperbarui' : 'Barang Ditambahkan',
        isEdit ? `${data.description} berhasil diperbarui` : `${data.description} berhasil ditambahkan`,
      );
      if (typeof onSuccess === 'function') onSuccess(res.data);
    } else {
      // Tampilkan error spesifik
      if (res.error.code === 'DUPLICATE_SERIAL') {
        const sn = form.querySelector('[name="serialNumber"]');
        if (sn) sn.classList.add('error');
        const errEl = form.querySelector('#err-serialNumber');
        if (errEl) { errEl.textContent = res.error.message; errEl.hidden = false; }
      } else {
        toast.error('Gagal Menyimpan', res.error.message);
      }
    }
  } catch (err) {
    toast.error('Error', err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = isEdit ? 'Simpan Perubahan' : 'Tambah Barang';
    }
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return isoStr; }
}
