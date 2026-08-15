/**
 * part-form.js — Form Tambah/Edit Barang untuk SAP StockMon (Remake & Full Polish)
 * Fitur:
 * - Smart real-time category suggestion based on description keyword matching
 * - Client-side field validation & inline errors
 * - Serial number auto-generation hint
 * - Responsive multi-column layout
 */

import { toast } from '../components/toast.js';

// Kategori dari database
const CATEGORY_OPTIONS = [
  'Uncategorized',
  'Mechanical/Fastener',
  'Mechanical/Bearing',
  'Mechanical/Seal',
  'Mechanical/Pipe & Fitting',
  'Mechanical/Belt & Chain',
  'Electrical/Cable',
  'Electrical/Component',
  'Electrical/Panel',
  'Instrument/Pressure',
  'Instrument/Flow',
  'Consumable/Lubricant',
  'Consumable/Chemical',
  'Tool',
  'Safety',
];

const UNIT_OPTIONS = [
  'pcs', 'meter', 'kg', 'set', 'liter',
  'box', 'roll', 'batang', 'lembar', 'unit', 'buah', 'pak', 'pasang',
];

const KEYWORD_RULES = [
  { category: 'Mechanical/Fastener', keywords: ['baut', 'bolt', 'screw', 'mur', 'nut', 'sekrup', 'angkur', 'stud', 'washer', 'ring plat'] },
  { category: 'Mechanical/Bearing', keywords: ['bearing', 'laher', 'pillow block', 'ball bearing', 'roller bearing', 'ucp'] },
  { category: 'Mechanical/Seal', keywords: ['seal', 'gasket', 'o-ring', 'packing', 'oil seal', 'mechanical seal'] },
  { category: 'Mechanical/Pipe & Fitting', keywords: ['pipa', 'pipe', 'elbow', 'flange', 'tee', 'reducer', 'valve', 'fitting', 'nipple'] },
  { category: 'Mechanical/Belt & Chain', keywords: ['v-belt', 'belt', 'rantai', 'chain', 'sprocket', 'pulley', 'timing belt'] },
  { category: 'Electrical/Cable', keywords: ['kabel', 'cable', 'wire', 'nyy', 'nyfgbhy', 'nyaf', 'kawat tembaga'] },
  { category: 'Electrical/Component', keywords: ['relay', 'contactor', 'mcb', 'mccb', 'fuse', 'inverter', 'plc', 'terminal block', 'timer'] },
  { category: 'Electrical/Panel', keywords: ['panel', 'box panel', 'enclosure', 'busbar', 'duct'] },
  { category: 'Instrument/Pressure', keywords: ['pressure', 'gauge', 'manometer', 'transmitter', 'pressure switch'] },
  { category: 'Instrument/Flow', keywords: ['flow', 'flowmeter', 'rotameter', 'level sensor', 'temperature', 'thermocouple', 'pt100'] },
  { category: 'Consumable/Lubricant', keywords: ['oli', 'oil', 'grease', 'pelumas', 'gemuk', 'wd-40', 'shell tellus', 'meditran'] },
  { category: 'Consumable/Chemical', keywords: ['cleaner', 'thinner', 'cat', 'lem', 'loctite', 'sealant', 'alkohol'] },
  { category: 'Tool', keywords: ['kunci', 'wrench', 'obeng', 'screwdriver', 'tang', 'plier', 'gerinda', 'bor', 'drill', 'palu', 'hammer'] },
  { category: 'Safety', keywords: ['helm', 'safety', 'sarung tangan', 'glove', 'kacamata', 'goggle', 'sepatu safety', 'earplug', 'masker', 'rompi'] },
];

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

      <!-- Row 2: Description + Realtime Classification Hint -->
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <label class="form-label required" for="pf-desc">Deskripsi Barang</label>
          <span id="category-suggestion-badge" style="font-size:var(--text-xs);color:var(--color-accent);display:none">
            💡 Saran Kategori Terdeteksi
          </span>
        </div>
        <input type="text" class="form-input" id="pf-desc" name="description"
          value="${val('description')}" placeholder="Ketik nama spesifikasi barang lengkap (contoh: Baut M10x30 SS304)..." required>
        <span class="form-error" id="err-description" hidden></span>
      </div>

      <!-- Row 3: Serial + Category -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">

        <div class="form-group">
          <label class="form-label" for="pf-serial">Serial Number</label>
          <input type="text" class="form-input form-input--mono" id="pf-serial" name="serialNumber"
            value="${val('serialNumber')}" placeholder="Contoh: FAST-2026-0001"
            ${isEdit ? 'readonly title="Serial number tidak bisa diubah setelah dibuat"' : ''}>
          <span class="form-hint">${isEdit ? 'Tidak dapat diubah setelah dibuat' : 'Kosongkan untuk auto-generate otomatis'}</span>
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
          <label class="form-label required" for="pf-qty">${isEdit ? 'Stok Saat Ini' : 'Jumlah Masuk Awal (Qty)'}</label>
          <input type="number" class="form-input" id="pf-qty" name="${isEdit ? 'currentQty' : 'initialQty'}"
            value="${isEdit ? val('currentQty', 0) : val('initialQty', 1)}"
            min="0" step="1" required>
          <span class="form-error" id="err-qty" hidden></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-unit">Satuan (Unit)</label>
          <select class="form-select" id="pf-unit" name="unit">
            ${unitOpts}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-min-qty">
            Batas Minimum
            <span class="form-hint" style="display:inline;margin-left:var(--space-1)">(Alert LOW)</span>
          </label>
          <input type="number" class="form-input" id="pf-min-qty" name="minQty"
            value="${val('minQty', 5)}" min="0" step="1">
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
 * Submit handler
 */
export async function submitPartForm(form, partId = null, onSuccess) {
  const isEdit = !!partId;
  const data = validatePartForm(form, isEdit);
  if (!data) return;

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

/**
 * Attach live auto-categorization listener to description input
 */
export function attachCategorySuggest(form) {
  const descInput = form.querySelector('#pf-desc');
  const catSelect = form.querySelector('#pf-category');
  const badge = form.querySelector('#category-suggestion-badge');

  if (!descInput || !catSelect) return;

  descInput.addEventListener('input', () => {
    const text = descInput.value.toLowerCase();
    for (const rule of KEYWORD_RULES) {
      if (rule.keywords.some((k) => text.includes(k))) {
        catSelect.value = rule.category;
        if (badge) {
          badge.textContent = `💡 Saran: ${rule.category}`;
          badge.style.display = 'inline-block';
        }
        return;
      }
    }
    if (badge) badge.style.display = 'none';
  });
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Date(isoStr).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return isoStr; }
}
