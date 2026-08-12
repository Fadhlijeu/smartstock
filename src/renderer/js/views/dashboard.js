/**
 * dashboard.js — Grid Monitor Dashboard View
 * KPI strip + Scan bar + Parts grid
 */

import { state } from '../state.js';
import { toast } from '../components/toast.js';

let cleanupFns = [];

export async function mount(container) {
  // Load KPI data
  let kpis = { totalSku: 0, totalItems: 0, outCount: 0, lowCount: 0, reviewCount: 0, inToday: 0, outToday: 0 };
  let parts = [];

  try {
    const [kpiRes, partsRes] = await Promise.all([
      window.api.getKpiStats(),
      window.api.getParts({ sortBy: 'created_at', sortDir: 'DESC' }),
    ]);

    if (kpiRes.success) kpis = kpiRes.data;
    if (partsRes.success) parts = partsRes.data;

    state.setSilent('kpis', kpis);
    state.setSilent('parts', parts);
  } catch (err) {
    console.error('[Dashboard] Failed to load data:', err);
  }

  // Render
  container.innerHTML = renderDashboard(kpis, parts);

  // Bind events
  bindEvents(container);

  // Subscribe to stock updates from scanner (M3)
  const unsubStockUpdate = window.api.onStockUpdated((data) => {
    handleStockUpdate(data, container);
  });

  cleanupFns.push(unsubStockUpdate);

  // Return unmount function
  return unmount;
}

function unmount() {
  cleanupFns.forEach((fn) => typeof fn === 'function' && fn());
  cleanupFns = [];
}

function renderDashboard(kpis, parts) {
  return `
    <section class="dashboard-heading">
      <div>
        <p class="dashboard-heading__eyebrow">Overview inventaris</p>
        <h1 class="dashboard-heading__title">Kondisi stok saat ini</h1>
        <p class="dashboard-heading__description">Pantau ketersediaan dan proses scan tanpa berpindah halaman.</p>
      </div>
      <div class="dashboard-heading__status">
        <span class="dashboard-heading__status-dot"></span>
        Database lokal aktif
      </div>
    </section>

    <!-- KPI Strip -->
    <div class="kpi-strip" id="kpi-strip">
      ${renderKpiWidget('inventory_2', kpis.totalSku.toLocaleString('id'), 'Total SKU', '')}
      ${renderKpiWidget('warehouse', kpis.totalItems.toLocaleString('id'), 'Total Items', '')}
      ${renderKpiWidget('login', '+' + kpis.inToday.toLocaleString('id'), 'IN Hari Ini', 'ok')}
      ${renderKpiWidget('logout', kpis.outToday.toLocaleString('id'), 'OUT Hari Ini', '')}
      ${kpis.outCount > 0 ? renderKpiWidget('cancel', kpis.outCount, 'Stok Habis', 'danger') : ''}
      ${kpis.lowCount > 0 ? renderKpiWidget('warning', kpis.lowCount, 'Stok Rendah', 'warning') : ''}
      ${kpis.reviewCount > 0 ? renderKpiWidget('rate_review', kpis.reviewCount, 'Perlu Review', 'warning') : ''}
    </div>

    <!-- Scan Bar -->
    <div class="scan-bar" id="scan-bar">
      <span class="icon scan-bar__icon">barcode_scanner</span>
      <input type="text" id="scan-input" placeholder="Scan atau ketik QR ID / Serial Number..." autocomplete="off" spellcheck="false">
      <div class="scan-bar__direction direction-toggle">
        <button class="direction-btn active-in" id="btn-dir-in" aria-pressed="true">▲ IN</button>
        <button class="direction-btn" id="btn-dir-out" aria-pressed="false">▼ OUT</button>
      </div>
    </div>

    <!-- Grid Controls -->
    <div class="grid-controls" id="grid-controls">
      <div class="grid-controls__search">
        <span class="icon">search</span>
        <input type="text" id="search-input" placeholder="Cari barang..." autocomplete="off">
      </div>
      <button class="btn btn--secondary btn--sm" id="btn-filter">
        <span class="icon icon--sm">filter_list</span> Filter
      </button>
      <button class="btn btn--secondary btn--sm" id="btn-sort">
        <span class="icon icon--sm">sort</span> Urutkan
      </button>
      <div class="toggle" id="view-toggle">
        <button class="toggle__option active" data-view="grid" title="Grid View">
          <span class="icon icon--sm">grid_view</span>
        </button>
        <button class="toggle__option" data-view="list" title="List View">
          <span class="icon icon--sm">list</span>
        </button>
      </div>
      <button class="btn btn--primary btn--sm" id="btn-add-part">
        <span class="icon icon--sm">add</span> Tambah Barang
      </button>
    </div>

    <!-- Parts Grid -->
    <div id="parts-grid" class="parts-grid">
      ${parts.length === 0 ? renderEmptyState() : renderPartCards(parts)}
    </div>
  `;
}

function renderKpiWidget(icon, number, label, variant) {
  const variantClass = variant ? `kpi-widget--${variant}` : '';
  return `
    <div class="kpi-widget ${variantClass}">
      <span class="icon icon--lg icon--muted" aria-hidden="true">${icon}</span>
      <div class="kpi-widget__number">${number}</div>
      <div class="kpi-widget__label">${label}</div>
    </div>
  `;
}

function renderPartCards(parts) {
  return parts.map((part) => renderPartCard(part)).join('');
}

function renderPartCard(part) {
  const status = part.status || 'OK';
  const statusClass = status.toLowerCase();
  const cardBorderClass = status === 'OUT' ? 'part-card--out' : status === 'LOW' ? 'part-card--low' : '';

  const categoryShort = part.category
    ? part.category.split('/').map((s) => s.slice(0, 4).toUpperCase()).join('/')
    : 'UNCATG';

  return `
    <div class="part-card ${cardBorderClass} animate-card-in"
         data-part-id="${part.id}"
         tabindex="0"
         role="button"
         aria-label="${part.description} — Status: ${status}">

      <div class="part-card__header">
        <div class="part-card__icon">
          ${part.imagePath
            ? `<img src="${part.imagePath}" alt="${part.description}">`
            : `<span class="icon">inventory_2</span>`}
        </div>
        <span class="status-badge status-badge--${statusClass}">${status}</span>
      </div>

      <div class="part-card__body">
        <div class="part-card__name">${escapeHtml(part.description)}</div>
        <div class="part-card__meta">
          <span class="chip">${escapeHtml(categoryShort)}</span>
          <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink-muted)">
            ${escapeHtml(part.serialNumber || '—')}
          </span>
        </div>
      </div>

      <div class="part-card__footer">
        <div>
          <span class="part-card__qty">${(part.currentQty || 0).toLocaleString('id')}</span>
          <span class="part-card__qty-unit">${escapeHtml(part.unit || 'pcs')}</span>
        </div>
        <span class="part-card__qr-id">${escapeHtml(part.qrId || '—')}</span>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="empty-state" style="grid-column:1/-1">
      <span class="icon icon--2xl">inventory_2</span>
      <h3>Belum ada barang</h3>
      <p>Tambahkan barang pertama atau import dari CSV untuk memulai monitoring stock.</p>
      <button class="btn btn--primary" id="btn-add-part-empty">
        <span class="icon icon--sm">add</span> Tambah Barang
      </button>
    </div>
  `;
}

function bindEvents(container) {
  // Scan input
  const scanInput = container.querySelector('#scan-input');
  const scanBar = container.querySelector('#scan-bar');
  if (scanInput) {
    scanInput.addEventListener('focus', () => scanBar.classList.add('scan-bar--active'));
    scanInput.addEventListener('blur', () => scanBar.classList.remove('scan-bar--active'));
    scanInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && scanInput.value.trim()) {
        handleScanInput(scanInput.value.trim());
        scanInput.value = '';
      }
    });
  }

  // Direction toggle
  const btnIn = container.querySelector('#btn-dir-in');
  const btnOut = container.querySelector('#btn-dir-out');
  if (btnIn && btnOut) {
    btnIn.addEventListener('click', () => {
      btnIn.classList.add('active-in');
      btnOut.classList.remove('active-out');
      state.update('scanDirection', 'IN');
    });
    btnOut.addEventListener('click', () => {
      btnOut.classList.add('active-out');
      btnIn.classList.remove('active-in');
      state.update('scanDirection', 'OUT');
    });
  }

  // Search
  const searchInput = container.querySelector('#search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterAndRefreshGrid(container, searchInput.value);
      }, 300);
    });
  }

  // Part cards click
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.part-card[data-part-id]');
    if (card) {
      const partId = card.dataset.partId;
      openPartDetail(partId);
    }
  });

  // Card keyboard navigation
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.part-card[data-part-id]');
      if (card) {
        e.preventDefault();
        const partId = card.dataset.partId;
        openPartDetail(partId);
      }
    }
  });

  // Add part button
  const btnAdd = container.querySelector('#btn-add-part');
  const btnAddEmpty = container.querySelector('#btn-add-part-empty');
  const handleAddPart = () => {
    window.location.hash = '#parts';
    // Beri waktu sebentar untuk view mount sebelum trigger form
    setTimeout(() => {
      const addBtn = document.querySelector('#btn-add-part');
      if (addBtn) addBtn.click();
    }, 400);
  };
  if (btnAdd) btnAdd.addEventListener('click', handleAddPart);
  if (btnAddEmpty) btnAddEmpty.addEventListener('click', handleAddPart);

  // View toggle
  const viewToggle = container.querySelector('#view-toggle');
  if (viewToggle) {
    viewToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (!btn) return;
      viewToggle.querySelectorAll('.toggle__option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      const grid = container.querySelector('#parts-grid');
      if (grid) {
        grid.className = view === 'list' ? 'parts-grid parts-grid--list' : 'parts-grid';
      }
    });
  }
}

function handleScanInput(value) {
  // M3 akan menghandle ini dengan scan validator
  // Untuk sekarang: toast info
  toast.info('Scanner', `Input: ${value} — Scanner akan aktif di M3`);
}

async function filterAndRefreshGrid(container, search) {
  try {
    const res = await window.api.getParts({ search });
    if (res.success) {
      const grid = container.querySelector('#parts-grid');
      if (grid) {
        grid.innerHTML = res.data.length === 0 ? renderEmptyState() : renderPartCards(res.data);
      }
    }
  } catch (err) {
    console.error('[Dashboard] Filter error:', err);
  }
}

function handleStockUpdate(data, container) {
  // Flash animation pada card yang berubah
  const card = container.querySelector(`[data-part-id="${data.partId}"]`);
  if (card) {
    card.classList.add('animate-scan-success');
    card.addEventListener('animationend', () => card.classList.remove('animate-scan-success'), { once: true });

    // Update qty display
    const qtyEl = card.querySelector('.part-card__qty');
    if (qtyEl && data.newQty !== undefined) {
      qtyEl.textContent = data.newQty.toLocaleString('id');
    }
  }
}

async function openPartDetail(partId) {
  const { openModal } = await import('../components/modal.js');
  openModal({
    title: 'Detail Barang',
    body: `
      <div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4)">
        <div class="spinner spinner--lg"></div>
        <span style="color:var(--color-ink-secondary)">Memuat data...</span>
      </div>
    `,
    size: 'wide',
  });

  try {
    const res = await window.api.getPartById(partId);
    if (!res.success) {
      toast.error('Error', res.error.message);
      const { closeModal } = await import('../components/modal.js');
      closeModal();
      return;
    }

    const part = res.data;
    const { getEl } = openModal({
      title: part.description,
      body: renderPartDetailBody(part),
      size: 'wide',
      actions: [
        {
          label: 'Tutup',
          type: 'ghost',
          id: 'modal-close-action',
          onClick: async () => { const { closeModal } = await import('../components/modal.js'); closeModal(); },
        },
      ],
    });
  } catch (err) {
    toast.error('Error', err.message);
  }
}

function renderPartDetailBody(part) {
  const status = part.status || 'OK';
  const statusClass = status.toLowerCase();

  return `
    <div style="display:grid;grid-template-columns:80px 1fr;gap:var(--space-5)">
      <div class="part-card__icon" style="width:80px;height:80px;border-radius:var(--radius-lg)">
        <span class="icon icon--xl">inventory_2</span>
      </div>
      <div>
        <h3 style="font-size:var(--text-xl);font-weight:600;margin-bottom:var(--space-1)">${escapeHtml(part.description)}</h3>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <span class="status-badge status-badge--${statusClass}">${status}</span>
          <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-ink-muted)">${escapeHtml(part.serialNumber)}</span>
          <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-ink-muted)">${escapeHtml(part.qrId)}</span>
        </div>
      </div>
    </div>

    <div style="height:1px;background:var(--color-paper-border);margin:var(--space-5) 0"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
      ${renderDetailRow('Tanggal Masuk', part.dateEntry)}
      ${renderDetailRow('MR Invoice', part.mrInvoice)}
      ${renderDetailRow('Purchase Order', part.purchaseOrder)}
      ${renderDetailRow('Deskripsi', part.description)}
      ${renderDetailRow('Kategori', part.category)}
      ${renderDetailRow('Unit', part.unit)}
    </div>

    <div style="height:1px;background:var(--color-paper-border);margin:var(--space-5) 0"></div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4)">
      <div style="text-align:center">
        <div style="font-size:var(--text-2xl);font-weight:700;font-variant-numeric:tabular-nums">${(part.currentQty || 0).toLocaleString('id')}</div>
        <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">Stok Saat Ini</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-ink-muted)">${(part.initialQty || 0).toLocaleString('id')}</div>
        <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">Stok Awal</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-status-low)">${(part.minQty || 0).toLocaleString('id')}</div>
        <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">Min. Stok</div>
      </div>
    </div>

    <div style="height:1px;background:var(--color-paper-border);margin:var(--space-5) 0"></div>

    <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
      <button class="btn btn--secondary btn--sm">
        <span class="icon icon--sm">qr_code_2</span> Lihat QR
      </button>
      <button class="btn btn--secondary btn--sm">
        <span class="icon icon--sm">print</span> Print Label
      </button>
      <button class="btn btn--secondary btn--sm">
        <span class="icon icon--sm">receipt_long</span> Riwayat
      </button>
      <button class="btn btn--ghost btn--sm" style="margin-left:auto">
        <span class="icon icon--sm">edit</span> Edit
      </button>
    </div>
  `;
}

function renderDetailRow(label, value) {
  return `
    <div>
      <div style="font-size:var(--text-xs);color:var(--color-ink-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">${label}</div>
      <div style="font-size:var(--text-md);color:var(--color-ink-primary)">${escapeHtml(value || '—')}</div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
