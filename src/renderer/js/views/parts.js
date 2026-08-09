/**
 * parts.js — Manajemen Barang View (M0 placeholder, diperluas di M1)
 */

import { toast } from '../components/toast.js';

export async function mount(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Manajemen Barang</h2>
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn--secondary btn--sm" id="btn-import-csv">
          <span class="icon icon--sm">upload</span> Import CSV
        </button>
        <button class="btn btn--primary btn--sm" id="btn-add-part">
          <span class="icon icon--sm">add</span> Tambah Barang
        </button>
      </div>
    </div>

    <div class="empty-state">
      <span class="icon icon--2xl">inventory_2</span>
      <h3>Manajemen Barang</h3>
      <p>Fitur ini akan tersedia di <strong>Milestone 1</strong> — CRUD barang, form input, dan import CSV.</p>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
        <button class="btn btn--primary" id="btn-goto-dashboard">
          <span class="icon icon--sm">grid_view</span> Ke Dashboard
        </button>
      </div>
    </div>
  `;

  const btnDash = container.querySelector('#btn-goto-dashboard');
  if (btnDash) btnDash.addEventListener('click', () => { window.location.hash = '#dashboard'; });

  const btnImport = container.querySelector('#btn-import-csv');
  if (btnImport) btnImport.addEventListener('click', () => {
    toast.info('Coming Soon', 'Import CSV akan tersedia di Milestone 1');
  });

  const btnAdd = container.querySelector('#btn-add-part');
  if (btnAdd) btnAdd.addEventListener('click', () => {
    toast.info('Coming Soon', 'Form tambah barang akan tersedia di Milestone 1');
  });
}
