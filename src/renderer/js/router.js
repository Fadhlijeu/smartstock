/**
 * router.js — Hash-based SPA Router untuk SAP StockMon
 * Route: #dashboard, #scanner, #parts, #history, #reports, #settings
 */

import { state } from './state.js';

/** @type {Record<string, () => Promise<{mount: Function, unmount?: Function}>>} */
export const ROUTES = {
  '#dashboard':  () => import('./views/dashboard.js'),
  '#scanner':    () => import('./views/scanner.js'),
  '#parts':      () => import('./views/parts.js'),
  '#history':    () => import('./views/history.js'),
  '#reports':    () => import('./views/reports.js'),
  '#settings':   () => import('./views/settings.js'),
};

export const DEFAULT_ROUTE = '#dashboard';


let currentUnmount = null;
let currentHash = null;

/**
 * Navigate ke route tertentu
 * @param {string} hash - contoh '#dashboard'
 */
export function navigate(hash) {
  if (hash === currentHash) return;
  window.location.hash = hash;
}

/**
 * Inisialisasi router — panggil sekali di app.js
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Handle initial route
}

async function handleRoute() {
  const hash = window.location.hash || DEFAULT_ROUTE;
  const normalizedHash = hash.split('?')[0]; // Strip query params

  const routeLoader = ROUTES[normalizedHash] || ROUTES[DEFAULT_ROUTE];

  // Unmount current view
  if (typeof currentUnmount === 'function') {
    try {
      currentUnmount();
    } catch (err) {
      console.error('[Router] Error during unmount:', err);
    }
    currentUnmount = null;
  }

  // Update nav active state
  updateNavActive(normalizedHash);

  // Update state
  state.update('currentView', normalizedHash.slice(1));

  // Load dan mount view
  const pageContent = document.getElementById('page-content');
  if (!pageContent) return;

  // Show loading state
  pageContent.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:200px;">
      <div class="spinner spinner--lg"></div>
    </div>
  `;

  try {
    const module = await routeLoader();
    currentHash = normalizedHash;

    // Mount view
    if (typeof module.mount === 'function') {
      currentUnmount = await module.mount(pageContent) || null;
    }
  } catch (err) {
    console.error('[Router] Failed to load view:', normalizedHash, err);
    pageContent.innerHTML = `
      <div class="empty-state">
        <span class="icon icon--2xl icon--muted">error</span>
        <h3>Gagal memuat halaman</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function updateNavActive(activeHash) {
  // Remove all active states
  document.querySelectorAll('.nav-item[data-route]').forEach((el) => {
    el.classList.remove('active');
  });

  // Set active
  const activeEl = document.querySelector(`.nav-item[data-route="${activeHash}"]`);
  if (activeEl) {
    activeEl.classList.add('active');
  }

  // Update topbar title
  const titles = {
    '#dashboard': 'Dashboard',
    '#scanner': 'Scanner',
    '#parts': 'Manajemen Barang',
    '#history': 'Riwayat Transaksi',
    '#reports': 'Laporan & Export',
    '#settings': 'Pengaturan',
  };

  const topbarTitle = document.querySelector('.topbar-title');
  if (topbarTitle) {
    topbarTitle.textContent = titles[activeHash] || 'SAP StockMon';
  }
}
