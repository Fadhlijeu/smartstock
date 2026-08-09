/**
 * settings.js — Pengaturan View
 * Theme toggle, scanner config, dan app info.
 */

import { toast } from '../components/toast.js';

export async function mount(container) {
  // Load current settings
  let settings = {};
  try {
    const res = await window.api.getSettings();
    if (res.success) settings = res.data;
  } catch (err) {
    console.error('[Settings] Failed to load:', err);
  }

  const currentTheme = settings['app.theme'] || 'dark';
  const beepEnabled = settings['scanner.beep'] !== false;
  const gridSize = settings['display.grid_size'] || 'medium';

  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Pengaturan</h2>
      <button class="btn btn--primary btn--sm" id="btn-save-settings">
        <span class="icon icon--sm">save</span> Simpan
      </button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);max-width:900px">

      <!-- Tampilan -->
      ${renderSection('Tampilan', 'display_settings', `
        <div class="form-group">
          <label class="form-label">Tema</label>
          <div class="toggle" style="width:fit-content">
            <button class="toggle__option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" id="theme-dark">
              <span class="icon icon--sm">dark_mode</span> Dark
            </button>
            <button class="toggle__option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" id="theme-light">
              <span class="icon icon--sm">light_mode</span> Light
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Ukuran Grid</label>
          <select class="form-select" id="grid-size-select" style="width:auto">
            <option value="small" ${gridSize === 'small' ? 'selected' : ''}>Kecil (5 kolom)</option>
            <option value="medium" ${gridSize === 'medium' ? 'selected' : ''}>Sedang (4 kolom)</option>
            <option value="large" ${gridSize === 'large' ? 'selected' : ''}>Besar (2-3 kolom)</option>
          </select>
        </div>
      `)}

      <!-- Scanner -->
      ${renderSection('Scanner', 'barcode_scanner', `
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer">
            <input type="checkbox" id="beep-enabled" ${beepEnabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--color-accent)">
            Beep saat scan (audio feedback)
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">Volume Beep</label>
          <input type="range" id="beep-volume" min="0" max="1" step="0.1"
            value="${settings['scanner.beep_volume'] ?? 0.7}"
            style="width:100%;accent-color:var(--color-accent)">
        </div>
      `)}

      <!-- Stock -->
      ${renderSection('Stock Alert', 'warning', `
        <div class="form-group">
          <label class="form-label">Min. Qty Default</label>
          <input type="number" class="form-input" id="min-qty-default" min="0"
            value="${settings['stock.min_qty_default'] ?? 5}"
            style="width:120px">
          <span class="form-hint">Threshold stok rendah default untuk barang baru</span>
        </div>
      `)}

      <!-- QR -->
      ${renderSection('QR Code', 'qr_code_2', `
        <div class="form-group">
          <label class="form-label">Error Correction Level</label>
          <select class="form-select" id="qr-ecc" style="width:auto">
            <option value="L" ${(settings['qr.error_correction'] || 'M') === 'L' ? 'selected' : ''}>L — Low (7%)</option>
            <option value="M" ${(settings['qr.error_correction'] || 'M') === 'M' ? 'selected' : ''}>M — Medium (15%)</option>
            <option value="Q" ${(settings['qr.error_correction'] || 'M') === 'Q' ? 'selected' : ''}>Q — Quartile (25%)</option>
            <option value="H" ${(settings['qr.error_correction'] || 'M') === 'H' ? 'selected' : ''}>H — High (30%)</option>
          </select>
        </div>
      `)}

      <!-- Database -->
      ${renderSection('Database', 'storage', `
        <div class="form-group">
          <label class="form-label">Lokasi Data</label>
          <div style="display:flex;gap:var(--space-2)">
            <input type="text" class="form-input form-input--mono" id="data-path" readonly
              placeholder="(app userData folder)" style="flex:1;color:var(--color-ink-muted)">
            <button class="btn btn--secondary btn--sm" id="btn-open-data-dir">
              <span class="icon icon--sm">folder_open</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer">
            <input type="checkbox" id="backup-auto" style="width:16px;height:16px;accent-color:var(--color-accent)">
            Auto-backup harian (tersedia di M5)
          </label>
        </div>
      `)}

      <!-- Tentang -->
      ${renderSection('Tentang', 'info', `
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Aplikasi</span>
            <span style="font-weight:600;font-size:var(--text-sm)">SAP StockMon</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Versi</span>
            <span style="font-family:var(--font-mono);font-size:var(--text-sm)" id="app-version">0.1.0</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Milestone</span>
            <span class="chip chip--accent">M0 — Foundation</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Stack</span>
            <span style="font-size:var(--text-sm)">Electron · SQLite · Vanilla JS</span>
          </div>
        </div>
      `)}
    </div>
  `;

  // Load app version
  try {
    const vRes = await window.api.getAppVersion();
    if (vRes.success) {
      const vEl = container.querySelector('#app-version');
      if (vEl) vEl.textContent = vRes.data;
    }
  } catch {}

  // Theme toggle
  container.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-theme]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
    });
  });

  // Open data dir
  const btnOpenDir = container.querySelector('#btn-open-data-dir');
  if (btnOpenDir) btnOpenDir.addEventListener('click', () => window.api.openDataDir());

  // Save settings
  const btnSave = container.querySelector('#btn-save-settings');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const updates = {};

      const themeDark = container.querySelector('#theme-dark');
      updates['app.theme'] = themeDark?.classList.contains('active') ? 'dark' : 'light';

      const beep = container.querySelector('#beep-enabled');
      updates['scanner.beep'] = beep?.checked ?? true;

      const vol = container.querySelector('#beep-volume');
      updates['scanner.beep_volume'] = parseFloat(vol?.value ?? 0.7);

      const minQty = container.querySelector('#min-qty-default');
      updates['stock.min_qty_default'] = parseInt(minQty?.value ?? 5);

      const qrEcc = container.querySelector('#qr-ecc');
      updates['qr.error_correction'] = qrEcc?.value ?? 'M';

      const gridSizeEl = container.querySelector('#grid-size-select');
      updates['display.grid_size'] = gridSizeEl?.value ?? 'medium';

      try {
        const res = await window.api.updateSettings(updates);
        if (res.success) {
          toast.success('Pengaturan disimpan', 'Semua pengaturan berhasil disimpan');
        } else {
          toast.error('Gagal menyimpan', res.error?.message || 'Terjadi kesalahan');
        }
      } catch (err) {
        toast.error('Error', err.message);
      }
    });
  }
}

function renderSection(title, icon, content) {
  return `
    <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-6)">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5)">
        <span class="icon" style="color:var(--color-accent)">${icon}</span>
        <span style="font-size:var(--text-md);font-weight:600">${title}</span>
      </div>
      ${content}
    </div>
  `;
}
