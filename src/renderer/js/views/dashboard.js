/**
 * dashboard.js — M4 Grid Monitor Dashboard
 * KPI strip + Scan bar + Parts grid dengan fitur penuh:
 * - Category-based icons
 * - Status borders (ok/low/out/review)
 * - Right-click context menu
 * - Min qty progress bar
 * - Filter panel (status + category)
 * - Sort dropdown
 * - View modes: grid / compact / list
 * - Real-time stock update dengan status badge + flash animation
 */

import { state } from '../state.js';
import { toast } from '../components/toast.js';

// ─── MODULE STATE ─────────────────────────────────────────────────────────────
let cleanupFns = [];
let _container = null;
let _allParts = [];
let _viewMode = 'grid'; // 'grid' | 'compact' | 'list'
let _sort = 'status';   // 'status' | 'name' | 'qty-asc' | 'qty-desc' | 'date'
let _filters = { status: '', category: '' };
let _contextMenu = null; // referensi context menu aktif

// ─── MOUNT / UNMOUNT ──────────────────────────────────────────────────────────
export async function mount(container) {
  _container = container;
  let kpis = { totalSku: 0, totalItems: 0, outCount: 0, lowCount: 0, reviewCount: 0, inToday: 0, outToday: 0 };

  try {
    const [kpiRes, partsRes] = await Promise.all([
      window.api.getKpiStats(),
      window.api.getParts({ sortBy: 'created_at', sortDir: 'DESC' }),
    ]);
    if (kpiRes.success) kpis = kpiRes.data;
    if (partsRes.success) _allParts = partsRes.data;
    state.setSilent('kpis', kpis);
    state.setSilent('parts', _allParts);
  } catch (err) {
    console.error('[Dashboard] Failed to load data:', err);
  }

  container.innerHTML = renderDashboard(kpis);
  renderGrid(container);
  bindEvents(container);
  updateSidebarBadge(kpis);

  // Subscribe to stock updates dari scanner (IPC event)
  const unsubStockUpdate = window.api.onStockUpdated((data) => {
    handleStockUpdate(data, container);
    refreshKpis(container);
  });
  cleanupFns.push(unsubStockUpdate);

  // Dismiss context menu saat klik di luar
  const dismissCtx = (e) => {
    if (_contextMenu && !_contextMenu.contains(e.target)) dismissContextMenu();
  };
  document.addEventListener('mousedown', dismissCtx);
  cleanupFns.push(() => document.removeEventListener('mousedown', dismissCtx));

  return unmount;
}

function unmount() {
  cleanupFns.forEach((fn) => typeof fn === 'function' && fn());
  cleanupFns = [];
  _container = null;
  dismissContextMenu();
}

// ─── SHELL RENDER ─────────────────────────────────────────────────────────────
function renderDashboard(kpis) {
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
      ${renderKpiWidgets(kpis)}
    </div>

    <!-- Scan Bar -->
    <div class="scan-bar" id="scan-bar">
      <span class="icon scan-bar__icon">barcode_scanner</span>
      <input type="text" id="scan-input" placeholder="Scan atau ketik QR ID / Serial Number..." autocomplete="off" spellcheck="false">
      <div class="scan-bar__direction direction-toggle">
        <button class="direction-btn active" id="btn-dir-in" aria-pressed="true">▲ IN</button>
        <button class="direction-btn" id="btn-dir-out" aria-pressed="false">▼ OUT</button>
      </div>
    </div>

    <!-- Grid Controls -->
    <div class="grid-controls" id="grid-controls">
      <div class="grid-controls__search">
        <span class="icon">search</span>
        <input type="text" id="search-input" placeholder="Cari barang..." autocomplete="off">
      </div>

      <!-- Status filter pills -->
      <div id="status-filter-pills" style="display:flex;gap:var(--space-1)">
        ${renderStatusPill('', 'Semua')}
        ${renderStatusPill('OK', 'OK')}
        ${renderStatusPill('LOW', 'Low')}
        ${renderStatusPill('OUT', 'Out')}
        ${renderStatusPill('REVIEW', 'Review')}
      </div>

      <!-- Category filter -->
      <select class="form-select" id="category-filter" style="height:32px;width:auto;font-size:var(--text-xs)">
        <option value="">Semua Kategori</option>
      </select>

      <!-- Sort -->
      <select class="form-select" id="sort-select" style="height:32px;width:auto;font-size:var(--text-xs)">
        <option value="status">Status: Kritis dulu</option>
        <option value="name">Nama A–Z</option>
        <option value="qty-asc">Qty: Terkecil</option>
        <option value="qty-desc">Qty: Terbesar</option>
        <option value="date">Terbaru</option>
      </select>

      <!-- View mode toggle -->
      <div class="toggle" id="view-toggle">
        <button class="toggle__option active" data-view="grid" title="Grid View">
          <span class="icon icon--sm">grid_view</span>
        </button>
        <button class="toggle__option" data-view="compact" title="Compact View">
          <span class="icon icon--sm">dashboard</span>
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
      <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-12);grid-column:1/-1">
        <div class="spinner spinner--lg"></div>
      </div>
    </div>
  `;
}

function renderKpiWidgets(kpis) {
  return `
    ${renderKpiWidget('inventory_2', kpis.totalSku.toLocaleString('id'), 'Total SKU', '', '')}
    ${renderKpiWidget('warehouse', kpis.totalItems.toLocaleString('id'), 'Total Items', '', '')}
    ${renderKpiWidget('login', '+' + kpis.inToday.toLocaleString('id'), 'IN Hari Ini', 'ok', '')}
    ${renderKpiWidget('logout', kpis.outToday.toLocaleString('id'), 'OUT Hari Ini', '', '')}
    ${kpis.outCount > 0 ? renderKpiWidget('cancel', kpis.outCount, 'Stok Habis', 'danger', 'OUT') : ''}
    ${kpis.lowCount > 0 ? renderKpiWidget('warning', kpis.lowCount, 'Stok Rendah', 'warning', 'LOW') : ''}
    ${kpis.reviewCount > 0 ? renderKpiWidget('rate_review', kpis.reviewCount, 'Perlu Review', 'warning', 'REVIEW') : ''}
  `;
}

function renderKpiWidget(icon, number, label, variant, filterStatus = '') {
  const variantClass = variant ? `kpi-widget--${variant}` : '';
  const isSelected = filterStatus && _filters.status === filterStatus;
  const activeClass = isSelected ? ' kpi-widget--active' : '';
  return `
    <div class="kpi-widget ${variantClass}${activeClass}" ${filterStatus ? `data-filter-status="${filterStatus}" role="button" tabindex="0" title="Klik untuk filter ${label}" style="cursor:pointer"` : ''}>
      <span class="icon icon--lg icon--muted" aria-hidden="true">${icon}</span>
      <div class="kpi-widget__number">${number}</div>
      <div class="kpi-widget__label">${label}</div>
    </div>
  `;
}


function renderStatusPill(value, label) {
  const active = _filters.status === value;
  const colors = { OK: 'ok', LOW: 'low', OUT: 'out', REVIEW: 'review' };
  const colorKey = colors[value];
  const activeStyle = colorKey
    ? `background:var(--color-status-${colorKey}-dim);color:var(--color-status-${colorKey});border-color:var(--color-status-${colorKey})`
    : 'background:var(--color-paper-2);color:var(--color-ink-primary)';
  return `
    <button class="btn btn--ghost btn--sm status-pill ${active ? 'status-pill--active' : ''}"
      data-status="${value}"
      style="height:28px;padding:0 var(--space-3);font-size:var(--text-xs);
             ${active ? activeStyle : ''}">
      ${label}
    </button>
  `;
}

// ─── GRID RENDER ──────────────────────────────────────────────────────────────
function renderGrid(container) {
  const filtered = applyFiltersSort(_allParts);
  const grid = container.querySelector('#parts-grid');
  if (!grid) return;

  // Populate category filter
  const catSel = container.querySelector('#category-filter');
  if (catSel && catSel.options.length <= 1) {
    const cats = [...new Set(_allParts.map((p) => p.category).filter(Boolean))].sort();
    cats.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      if (c === _filters.category) opt.selected = true;
      catSel.appendChild(opt);
    });
  }

  // Update status pills active state
  container.querySelectorAll('.status-pill').forEach((btn) => {
    const isActive = btn.dataset.status === _filters.status;
    btn.classList.toggle('status-pill--active', isActive);
    const colors = { OK: 'ok', LOW: 'low', OUT: 'out', REVIEW: 'review' };
    const ck = colors[btn.dataset.status];
    btn.style.cssText = isActive
      ? (ck ? `height:28px;padding:0 var(--space-3);font-size:var(--text-xs);background:var(--color-status-${ck}-dim);color:var(--color-status-${ck});border-color:var(--color-status-${ck})` : `height:28px;padding:0 var(--space-3);font-size:var(--text-xs);background:var(--color-paper-2);color:var(--color-ink-primary)`)
      : 'height:28px;padding:0 var(--space-3);font-size:var(--text-xs)';
  });

  if (filtered.length === 0) {
    grid.innerHTML = renderEmptyState();
    return;
  }

  grid.className = `parts-grid${_viewMode === 'compact' ? ' parts-grid--compact' : _viewMode === 'list' ? ' parts-grid--list' : ''}`;
  grid.innerHTML = filtered.map((p) => renderPartCard(p)).join('');
}

function applyFiltersSort(parts) {
  let result = [...parts];

  // Search filter dari search input
  const searchEl = _container?.querySelector('#search-input');
  const search = (searchEl?.value || '').toLowerCase();
  if (search) {
    result = result.filter((p) =>
      [p.description, p.serialNumber, p.mrInvoice, p.qrId, p.category, p.purchaseOrder]
        .some((f) => (f || '').toLowerCase().includes(search))
    );
  }

  // Status filter
  if (_filters.status) {
    result = result.filter((p) => (p.status || 'OK') === _filters.status);
  }

  // Category filter
  if (_filters.category) {
    result = result.filter((p) => p.category === _filters.category);
  }

  // Sort
  const statusOrder = { OUT: 0, REVIEW: 1, LOW: 2, OK: 3 };
  switch (_sort) {
    case 'status':
      result.sort((a, b) => (statusOrder[a.status ?? 'OK'] ?? 3) - (statusOrder[b.status ?? 'OK'] ?? 3));
      break;
    case 'name':
      result.sort((a, b) => (a.description || '').localeCompare(b.description || '', 'id'));
      break;
    case 'qty-asc':
      result.sort((a, b) => (a.currentQty ?? 0) - (b.currentQty ?? 0));
      break;
    case 'qty-desc':
      result.sort((a, b) => (b.currentQty ?? 0) - (a.currentQty ?? 0));
      break;
    case 'date':
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
  }

  return result;
}

// ─── PART CARD ────────────────────────────────────────────────────────────────
/**
 * Menentukan Material Icon berdasarkan kategori barang.
 */
function getCategoryIcon(category) {
  if (!category) return 'inventory_2';
  const cat = category.toLowerCase();
  if (cat.includes('fastener') || cat.includes('bolt') || cat.includes('screw')) return 'hardware';
  if (cat.includes('bearing')) return 'settings';
  if (cat.includes('valve')) return 'tune';
  if (cat.includes('seal') || cat.includes('o-ring') || cat.includes('gasket')) return 'circle';
  if (cat.includes('cable') || cat.includes('wire')) return 'cable';
  if (cat.includes('sensor')) return 'sensors';
  if (cat.includes('control') || cat.includes('relay') || cat.includes('plc')) return 'electric_bolt';
  if (cat.includes('lubricant') || cat.includes('oil') || cat.includes('grease')) return 'water_drop';
  if (cat.includes('safety') || cat.includes('ppe')) return 'safety_check';
  if (cat.includes('filter')) return 'filter_alt';
  if (cat.includes('pump')) return 'water_pump';
  if (cat.includes('motor') || cat.includes('electric')) return 'bolt';
  if (cat.includes('mechanical')) return 'settings';
  if (cat.includes('electrical')) return 'electric_bolt';
  if (cat.includes('consumable')) return 'shopping_bag';
  return 'category';
}

function renderPartCard(part) {
  const status = part.status || 'OK';
  const icon = getCategoryIcon(part.category);

  // Border class per status sesuai spec
  const borderClass = status === 'OUT' ? 'part-card--out'
    : status === 'LOW' ? 'part-card--low'
    : status === 'REVIEW' ? 'part-card--review'
    : 'part-card--ok';

  // Badge label
  const badgeIcon = status === 'OK' ? 'check_circle'
    : status === 'LOW' ? 'warning'
    : status === 'OUT' ? 'cancel'
    : 'rate_review';

  // Min qty progress bar (0–100%)
  const minQty = part.minQty || 0;
  const currentQty = part.currentQty || 0;
  const initialQty = part.initialQty || currentQty || 1;
  const stockPct = Math.min(100, Math.round((currentQty / Math.max(initialQty, 1)) * 100));

  // "NEW" badge: kurang dari 24 jam sejak dibuat
  const isNew = part.createdAt && (Date.now() - new Date(part.createdAt).getTime()) < 86_400_000;

  // Category short label
  const catShort = part.category
    ? part.category.split('/').map((s) => s.slice(0, 6)).join(' / ')
    : 'Uncategorized';

  return `
    <div class="part-card ${borderClass} animate-card-in"
         data-part-id="${part.id}"
         data-min-qty="${minQty}"
         data-status="${status}"
         tabindex="0"
         role="button"
         aria-label="${escHtml(part.description)} — Status: ${status}">

      ${isNew ? '<span class="part-card__new-badge">NEW</span>' : ''}

      <!-- Header: icon + status badge -->
      <div class="part-card__header">
        <div class="part-card__icon">
          ${part.imagePath
            ? `<img src="${part.imagePath}" alt="${escHtml(part.description)}" loading="lazy">`
            : `<span class="icon">${icon}</span>`}
        </div>
        <span class="status-badge status-badge--${status.toLowerCase()}" data-status-badge>
          <span class="icon icon--xs">${badgeIcon}</span>
          ${status}
        </span>
      </div>

      <!-- Body: name + category -->
      <div class="part-card__body">
        <div class="part-card__name">${escHtml(part.description)}</div>
        <div class="part-card__meta">
          <span class="chip" style="font-size:10px">${escHtml(catShort)}</span>
        </div>
      </div>

      <!-- Min qty bar -->
      ${minQty > 0 ? `
        <div class="part-card__qty-bar" title="Stok: ${currentQty} / Min: ${minQty}">
          <div class="part-card__qty-bar-fill" style="width:${stockPct}%"></div>
        </div>
      ` : ''}

      <!-- Footer: qty + QR ID -->
      <div class="part-card__footer">
        <div>
          <span class="part-card__qty" data-qty="${currentQty}">${currentQty.toLocaleString('id')}</span>
          <span class="part-card__qty-unit">${escHtml(part.unit || 'pcs')}</span>
        </div>
        <span class="part-card__qr-id">${escHtml(part.qrId || '—')}</span>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  const hasFilter = _filters.status || _filters.category || _container?.querySelector('#search-input')?.value;
  if (hasFilter) {
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="icon icon--2xl">filter_list</span>
        <h3>Tidak ada barang yang cocok</h3>
        <p>Filter aktif tidak menghasilkan data. Coba ubah atau reset filter.</p>
        <button class="btn btn--secondary" id="btn-reset-filter">
          <span class="icon icon--sm">filter_alt_off</span> Reset Filter
        </button>
      </div>
    `;
  }
  return `
    <div class="empty-state" style="grid-column:1/-1">
      <span class="icon icon--2xl">inventory_2</span>
      <h3>Belum ada barang</h3>
      <p>Tambahkan barang pertama atau import dari CSV untuk memulai monitoring stock.</p>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
        <button class="btn btn--secondary" id="btn-empty-import">
          <span class="icon icon--sm">upload</span> Import CSV
        </button>
        <button class="btn btn--primary" id="btn-add-part-empty">
          <span class="icon icon--sm">add</span> Tambah Barang
        </button>
      </div>
    </div>
  `;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function bindEvents(container) {
  // Scan input — terhubung ke handleScanInput yang sesungguhnya
  const scanInput = container.querySelector('#scan-input');
  const scanBar = container.querySelector('#scan-bar');
  if (scanInput) {
    scanInput.addEventListener('focus', () => scanBar.classList.add('scan-bar--active'));
    scanInput.addEventListener('blur', () => scanBar.classList.remove('scan-bar--active'));
    scanInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && scanInput.value.trim()) {
        const value = scanInput.value.trim();
        scanInput.value = '';
        await handleScanInput(value, container);
      }
    });
  }

  // Direction toggle — pakai class 'active' yang konsisten dengan CSS
  const btnIn = container.querySelector('#btn-dir-in');
  const btnOut = container.querySelector('#btn-dir-out');
  if (btnIn && btnOut) {
    btnIn.addEventListener('click', () => {
      btnIn.classList.add('active');
      btnOut.classList.remove('active');
      state.update('scanDirection', 'IN');
    });
    btnOut.addEventListener('click', () => {
      btnOut.classList.add('active');
      btnIn.classList.remove('active');
      state.update('scanDirection', 'OUT');
    });
  }

  // Search (debounced)
  const searchInput = container.querySelector('#search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderGrid(container), 250);
    });
  }

  // Status filter pills
  container.querySelector('#status-filter-pills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.status-pill');
    if (!pill) return;
    _filters.status = pill.dataset.status;
    renderGrid(container);
  });

  // KPI Widget click → Filter status
  container.querySelector('#kpi-strip')?.addEventListener('click', (e) => {
    const kpiEl = e.target.closest('.kpi-widget[data-filter-status]');
    if (!kpiEl) return;
    const targetStatus = kpiEl.dataset.filterStatus;
    _filters.status = _filters.status === targetStatus ? '' : targetStatus;
    renderGrid(container);
  });


  // Category filter
  container.querySelector('#category-filter')?.addEventListener('change', (e) => {
    _filters.category = e.target.value;
    renderGrid(container);
  });

  // Sort
  container.querySelector('#sort-select')?.addEventListener('change', (e) => {
    _sort = e.target.value;
    renderGrid(container);
  });

  // View mode toggle
  container.querySelector('#view-toggle')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    container.querySelectorAll('#view-toggle .toggle__option').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    _viewMode = btn.dataset.view;
    renderGrid(container);
  });

  // Add part button
  const handleAddPart = () => {
    window.location.hash = '#parts';
    setTimeout(() => {
      const addBtn = document.querySelector('#btn-add-part');
      if (addBtn) addBtn.click();
    }, 400);
  };
  container.querySelector('#btn-add-part')?.addEventListener('click', handleAddPart);

  // Card events (delegation)
  const grid = container.querySelector('#parts-grid');
  if (grid) {
    // Single click → detail
    grid.addEventListener('click', (e) => {
      if (_contextMenu) { dismissContextMenu(); return; }
      const card = e.target.closest('.part-card[data-part-id]');
      if (!card) {
        // Reset filter button dalam empty state
        if (e.target.closest('#btn-reset-filter')) {
          _filters = { status: '', category: '' };
          container.querySelector('#search-input').value = '';
          container.querySelector('#category-filter').value = '';
          renderGrid(container);
        }
        if (e.target.closest('#btn-add-part-empty')) handleAddPart();
        if (e.target.closest('#btn-empty-import')) {
          window.location.hash = '#parts';
          setTimeout(() => document.querySelector('#btn-import-csv')?.click(), 400);
        }
        return;
      }
      openPartDetail(card.dataset.partId);
    });

    // Double click → pre-fill scan bar
    grid.addEventListener('dblclick', (e) => {
      const card = e.target.closest('.part-card[data-part-id]');
      if (!card) return;
      const part = _allParts.find((p) => p.id === card.dataset.partId);
      if (part && scanInput) {
        scanInput.value = part.qrId || part.serialNumber || '';
        scanInput.focus();
      }
    });

    // Keyboard navigation
    grid.addEventListener('keydown', (e) => {
      const card = e.target.closest('.part-card[data-part-id]');
      if (!card) return;
      if (e.key === 'Enter') { e.preventDefault(); openPartDetail(card.dataset.partId); }
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); openQR(card.dataset.partId); }
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); openEditPart(card.dataset.partId); }
      // Arrow key navigation
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        navigateCards(card, e.key);
      }
    });

    // Right click → context menu
    grid.addEventListener('contextmenu', (e) => {
      const card = e.target.closest('.part-card[data-part-id]');
      if (!card) return;
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, card.dataset.partId);
    });
  }
}

// ─── CARD KEYBOARD NAVIGATION ─────────────────────────────────────────────────
function navigateCards(currentCard, key) {
  const cards = [...(_container?.querySelectorAll('.part-card[data-part-id]') || [])];
  const idx = cards.indexOf(currentCard);
  if (idx < 0) return;

  let nextIdx = idx;
  if (key === 'ArrowRight' || key === 'ArrowDown') nextIdx = Math.min(idx + 1, cards.length - 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') nextIdx = Math.max(idx - 1, 0);

  cards[nextIdx]?.focus();
}

// ─── CONTEXT MENU ─────────────────────────────────────────────────────────────
function showContextMenu(x, y, partId) {
  dismissContextMenu();

  const menu = document.createElement('div');
  menu.id = 'ctx-menu';
  menu.className = 'ctx-menu';
  menu.innerHTML = `
    <button class="ctx-menu__item" data-action="qr">
      <span class="icon icon--sm">qr_code_2</span> Lihat QR Code
    </button>
    <button class="ctx-menu__item" data-action="edit">
      <span class="icon icon--sm">edit</span> Edit Barang
    </button>
    <button class="ctx-menu__item" data-action="history">
      <span class="icon icon--sm">receipt_long</span> Riwayat Transaksi
    </button>
    <div class="ctx-menu__divider"></div>
    <button class="ctx-menu__item ctx-menu__item--danger" data-action="delete">
      <span class="icon icon--sm">delete</span> Hapus Barang
    </button>
  `;

  // Posisi menu (jangan keluar dari viewport)
  menu.style.cssText = `
    position:fixed;left:${x}px;top:${y}px;z-index:9999;
    min-width:180px;
  `;
  document.body.appendChild(menu);
  _contextMenu = menu;

  // Adjust jika keluar viewport
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) menu.style.top = `${y - rect.height}px`;
  });

  menu.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    dismissContextMenu();
    const action = btn.dataset.action;
    if (action === 'qr') openQR(partId);
    if (action === 'edit') openEditPart(partId);
    if (action === 'history') window.location.hash = '#history';
    if (action === 'delete') await handleDeletePart(partId);
  });
}

function dismissContextMenu() {
  if (_contextMenu) {
    _contextMenu.remove();
    _contextMenu = null;
  }
}

// ─── SCAN PROCESSING ──────────────────────────────────────────────────────────
/**
 * Proses input dari scan bar di dashboard.
 * Menggunakan arah transaksi dari state (IN/OUT).
 */
async function handleScanInput(value, container) {
  const direction = state.get('scanDirection') || 'IN';

  let qrId = null;
  let serialNumber = null;

  if (value.startsWith('{')) {
    try {
      const payload = JSON.parse(value);
      qrId = payload.qrId || payload.id;
      serialNumber = payload.sn;
    } catch (_) { /* bukan JSON valid */ }
  }

  if (!qrId) {
    if (/^QR-\d{4}-\d{4,}$/i.test(value)) {
      qrId = value.toUpperCase();
    } else {
      serialNumber = value;
    }
  }

  let partRes;
  try {
    partRes = qrId
      ? await window.api.getPartByQrId(qrId)
      : await window.api.getPartBySerialNumber(serialNumber);
  } catch (err) {
    toast.error('Scan Error', err.message);
    return;
  }

  if (!partRes?.success) {
    toast.error('Tidak Ditemukan', `Barang "${value}" tidak ada di database`);
    // Flash error pada card pertama sebagai feedback visual
    flashErrorScanBar(container);
    return;
  }

  const part = partRes.data;
  const qty = 1;

  if (direction === 'OUT' && part.currentQty < qty) {
    toast.error('Stok Tidak Cukup', `Sisa stok: ${part.currentQty} ${part.unit}`);
    return;
  }

  const txRes = await window.api.createTransaction({
    partId: part.id,
    qrId: part.qrId,
    direction,
    quantity: qty,
    scanMethod: 'manual',
  });

  if (!txRes.success) {
    toast.error('Transaksi Gagal', txRes.error.message);
    return;
  }

  const newQty = direction === 'OUT' ? part.currentQty - qty : part.currentQty + qty;
  const dirIcon = direction === 'OUT' ? '−' : '+';
  toast.success(
    `${direction === 'OUT' ? 'Keluar' : 'Masuk'}: ${part.description}`,
    `${dirIcon}${qty} ${part.unit} → sisa ${newQty}`
  );
}

function flashErrorScanBar(container) {
  const bar = container?.querySelector('#scan-bar');
  if (!bar) return;
  bar.style.transition = 'box-shadow 0.1s';
  bar.style.boxShadow = '0 0 0 3px var(--color-status-out)';
  setTimeout(() => { bar.style.boxShadow = ''; }, 600);
}

// ─── REAL-TIME STOCK UPDATE ───────────────────────────────────────────────────
function handleStockUpdate(data, container) {
  const card = container.querySelector(`[data-part-id="${data.partId}"]`);
  if (!card) return;

  const direction = data.direction || 'OUT';

  // Update qty display
  const qtyEl = card.querySelector('[data-qty]');
  if (qtyEl && data.newQty !== undefined) {
    qtyEl.textContent = data.newQty.toLocaleString('id');
    qtyEl.dataset.qty = data.newQty;
  }

  // Update status badge jika berubah
  if (data.newStatus) {
    card.dataset.status = data.newStatus;
    // Update border class
    card.classList.remove('part-card--ok', 'part-card--low', 'part-card--out', 'part-card--review');
    card.classList.add(`part-card--${data.newStatus.toLowerCase()}`);

    // Update badge
    const badge = card.querySelector('[data-status-badge]');
    if (badge) {
      const icons = { OK: 'check_circle', LOW: 'warning', OUT: 'cancel', REVIEW: 'rate_review' };
      badge.className = `status-badge status-badge--${data.newStatus.toLowerCase()}`;
      badge.innerHTML = `<span class="icon icon--xs">${icons[data.newStatus] || 'circle'}</span> ${data.newStatus}`;
    }
  }

  // Update local _allParts state
  const partIdx = _allParts.findIndex((p) => p.id === data.partId);
  if (partIdx >= 0) {
    _allParts[partIdx] = { ..._allParts[partIdx], currentQty: data.newQty, status: data.newStatus };
  }

  // Flash animation
  const flashClass = direction === 'IN' ? 'part-card--flash-success' : 'part-card--flash-out';
  card.classList.add(flashClass);
  card.addEventListener('animationend', () => card.classList.remove(flashClass), { once: true });
}

/**
 * Refresh hanya KPI strip tanpa reload seluruh halaman.
 */
async function refreshKpis(container) {
  try {
    const res = await window.api.getKpiStats();
    if (!res.success) return;
    const kpis = res.data;
    const strip = container.querySelector('#kpi-strip');
    if (strip) strip.innerHTML = renderKpiWidgets(kpis);
    updateSidebarBadge(kpis);
  } catch (_) { /* skip */ }
}

function updateSidebarBadge(kpis) {
  const badge = document.querySelector('#sidebar-alert-badge');
  const alertCount = (kpis.outCount || 0) + (kpis.lowCount || 0);
  if (badge) {
    badge.textContent = alertCount;
    badge.style.display = alertCount > 0 ? '' : 'none';
  }
}

// ─── MODALS & ACTIONS ─────────────────────────────────────────────────────────
async function openPartDetail(partId) {
  const { openModal, closeModal } = await import('../components/modal.js');

  try {
    const res = await window.api.getPartById(partId);
    if (!res.success) { toast.error('Error', res.error.message); return; }

    const part = res.data;
    const status = part.status || 'OK';
    const icon = getCategoryIcon(part.category);

    openModal({
      title: part.description,
      body: `
        <div style="display:grid;grid-template-columns:80px 1fr;gap:var(--space-5);margin-bottom:var(--space-5)">
          <div class="part-card__icon" style="width:80px;height:80px;border-radius:var(--radius-lg)">
            <span class="icon icon--xl">${icon}</span>
          </div>
          <div>
            <div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-2)">
              <span class="status-badge status-badge--${status.toLowerCase()}">${status}</span>
              <span class="chip">${escHtml(part.category || 'Uncategorized')}</span>
            </div>
            <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-ink-muted)">${escHtml(part.qrId)}</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink-muted)">${escHtml(part.serialNumber)}</div>
          </div>
        </div>

        <div style="height:1px;background:var(--color-paper-border);margin-bottom:var(--space-5)"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-5)">
          ${detailRow('Tanggal Masuk', part.dateEntry)}
          ${detailRow('MR Invoice', part.mrInvoice)}
          ${detailRow('Purchase Order', part.purchaseOrder)}
          ${detailRow('Unit', part.unit)}
        </div>

        <div style="height:1px;background:var(--color-paper-border);margin-bottom:var(--space-5)"></div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);text-align:center;margin-bottom:var(--space-5)">
          <div>
            <div style="font-size:var(--text-3xl);font-weight:700;font-variant-numeric:tabular-nums">${(part.currentQty || 0).toLocaleString('id')}</div>
            <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">Stok Saat Ini</div>
          </div>
          <div>
            <div style="font-size:var(--text-3xl);font-weight:700;color:var(--color-ink-muted)">${(part.initialQty || 0).toLocaleString('id')}</div>
            <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">Stok Awal</div>
          </div>
          <div>
            <div style="font-size:var(--text-3xl);font-weight:700;color:var(--color-status-low)">${(part.minQty || 0).toLocaleString('id')}</div>
            <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">Min. Stok</div>
          </div>
        </div>

        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          <button class="btn btn--secondary btn--sm" id="detail-qr-btn">
            <span class="icon icon--sm">qr_code_2</span> Lihat QR
          </button>
          <button class="btn btn--ghost btn--sm" style="margin-left:auto" id="detail-edit-btn">
            <span class="icon icon--sm">edit</span> Edit
          </button>
        </div>
      `,
      size: 'wide',
      actions: [
        { label: 'Tutup', type: 'ghost', id: 'detail-close-btn', onClick: () => closeModal() },
      ],
    });

    // QR button
    document.querySelector('#detail-qr-btn')?.addEventListener('click', () => {
      closeModal();
      openQR(partId);
    });

    // Edit button
    document.querySelector('#detail-edit-btn')?.addEventListener('click', () => {
      closeModal();
      openEditPart(partId);
    });
  } catch (err) {
    toast.error('Error', err.message);
  }
}

async function openQR(partId) {
  const { openQRModal } = await import('../components/qr-modal.js');
  const part = _allParts.find((p) => p.id === partId);
  if (part) openQRModal(part);
}

async function openEditPart(partId) {
  window.location.hash = '#parts';
  // Beri waktu view mount
  setTimeout(() => {
    const editBtn = document.querySelector(`[data-part-id="${partId}"].btn-edit-part`);
    if (editBtn) editBtn.click();
  }, 400);
}

async function handleDeletePart(partId) {
  const { confirmDialog } = await import('../components/modal.js');
  const part = _allParts.find((p) => p.id === partId);
  const confirmed = await confirmDialog(
    'Hapus Barang',
    `Yakin ingin menghapus "${part?.description || partId}"?\nData tidak benar-benar dihapus (soft delete).`,
    { confirmLabel: 'Ya, Hapus', danger: true }
  );
  if (!confirmed) return;

  const res = await window.api.deletePart(partId);
  if (res.success) {
    toast.success('Barang Dihapus', `${part?.description} berhasil dihapus`);
    _allParts = _allParts.filter((p) => p.id !== partId);
    renderGrid(_container);
    refreshKpis(_container);
  } else {
    toast.error('Gagal Hapus', res.error.message);
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function detailRow(label, value) {
  return `
    <div>
      <div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.08em;color:var(--color-ink-muted);margin-bottom:2px">${label}</div>
      <div style="font-size:var(--text-md)">${escHtml(String(value || '—'))}</div>
    </div>
  `;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
