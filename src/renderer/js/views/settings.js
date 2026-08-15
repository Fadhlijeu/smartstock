/**
 * settings.js — Pengaturan View (Remake & Full Polish)
 * Fitur:
 * - Theme toggle (Dark / Light)
 * - Scanner config & Sound Test Beep
 * - Default stock threshold
 * - Database folder & One-click Seed Demo Warehouse Data
 * - App version & system diagnostics
 */

import { toast } from '../components/toast.js';

export async function mount(container) {
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
      <div>
        <h2 class="section-title">Pengaturan Sistem</h2>
        <p style="font-size:var(--text-sm);color:var(--color-ink-muted);margin-top:2px">
          Konfigurasi tampilan, scanner, database, dan preferensi aplikasi
        </p>
      </div>
      <button class="btn btn--primary btn--sm" id="btn-save-settings">
        <span class="icon icon--sm">save</span> Simpan Pengaturan
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(380px, 1fr));gap:var(--space-6);max-width:960px">

      <!-- Tampilan -->
      ${renderSection('Tampilan & UI', 'palette', `
        <div class="form-group">
          <label class="form-label">Tema Aplikasi</label>
          <div class="toggle" style="width:fit-content">
            <button class="toggle__option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" id="theme-dark">
              <span class="icon icon--sm">dark_mode</span> Dark Mode
            </button>
            <button class="toggle__option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" id="theme-light">
              <span class="icon icon--sm">light_mode</span> Light Mode
            </button>
          </div>
        </div>

        <div class="form-group" style="margin-top:var(--space-4)">
          <label class="form-label">Tata Letak Grid Dashboard</label>
          <select class="form-select" id="grid-size-select" style="width:auto">
            <option value="small" ${gridSize === 'small' ? 'selected' : ''}>Kompak (Banyak Kolom)</option>
            <option value="medium" ${gridSize === 'medium' ? 'selected' : ''}>Standar (4 Kolom)</option>
            <option value="large" ${gridSize === 'large' ? 'selected' : ''}>Kartu Besar (2-3 Kolom)</option>
          </select>
        </div>
      `)}

      <!-- Scanner Audio & Hardware -->
      ${renderSection('Scanner & Audio Feedback', 'barcode_scanner', `
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer">
            <input type="checkbox" id="beep-enabled" ${beepEnabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--color-accent)">
            Bunyikan suara beep saat scan berhasil / gagal
          </label>
        </div>

        <div class="form-group" style="margin-top:var(--space-4)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-1)">
            <label class="form-label" style="margin:0">Volume Suara</label>
            <button class="btn btn--ghost btn--xs" id="btn-test-beep">
              <span class="icon icon--xs">volume_up</span> Test Suara
            </button>
          </div>
          <input type="range" id="beep-volume" min="0" max="1" step="0.05"
            value="${settings['scanner.beep_volume'] ?? 0.7}"
            style="width:100%;accent-color:var(--color-accent)">
        </div>
      `)}

      <!-- Stock Threshold -->
      ${renderSection('Ambang Batas Stok (Alert)', 'warning', `
        <div class="form-group">
          <label class="form-label">Min. Qty Default (Threshold Reorder)</label>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <input type="number" class="form-input" id="min-qty-default" min="0"
              value="${settings['stock.min_qty_default'] ?? 5}"
              style="width:120px">
            <span style="font-size:var(--text-sm);color:var(--color-ink-muted)">unit / pcs</span>
          </div>
          <span class="form-hint" style="margin-top:var(--space-1);display:block">
            Barang dengan stok di bawah angka ini otomatis diberi tanda peringatan KUNING (LOW)
          </span>
        </div>
      `)}

      <!-- Database & Sample Data -->
      ${renderSection('Database & Sampel Data', 'storage', `
        <div class="form-group">
          <label class="form-label">Database Folder</label>
          <div style="display:flex;gap:var(--space-2)">
            <input type="text" class="form-input form-input--mono" id="data-path" readonly
              value="SQLite (WAL Mode) - Local Storage" style="flex:1;color:var(--color-ink-muted);font-size:var(--text-xs)">
            <button class="btn btn--secondary btn--sm" id="btn-open-data-dir" title="Buka folder database">
              <span class="icon icon--sm">folder_open</span>
            </button>
          </div>
        </div>

        <div style="margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-paper-border)">
          <label class="form-label">Isi Sampel Data Gudang</label>
          <p style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-bottom:var(--space-2)">
            Tambah 10+ katalog barang realistis (Baut, Bearing, Seal, Kabel, dsb) untuk simulasi
          </p>
          <button class="btn btn--secondary btn--sm" id="btn-seed-demo-settings">
            <span class="icon icon--sm">dataset</span> Generate Sample Warehouse Data
          </button>
        </div>
      `)}

      <!-- Tentang Aplikasi -->
      ${renderSection('Tentang SAP StockMon', 'info', `
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Aplikasi</span>
            <span style="font-weight:600;font-size:var(--text-sm)">SAP StockMon (Gudang &amp; QR Inventory)</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Versi</span>
            <span style="font-family:var(--font-mono);font-size:var(--text-sm)" id="app-version">0.1.0</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Engine</span>
            <span class="chip chip--accent">Electron + SQLite WAL + 100% Offline</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Status Server</span>
            <span class="chip chip--ok">● Database Active</span>
          </div>
        </div>
      `)}

    </div>
  `;

  // App version
  try {
    const vRes = await window.api.getAppVersion();
    if (vRes.success) {
      const vEl = container.querySelector('#app-version');
      if (vEl) vEl.textContent = vRes.data;
    }
  } catch {}

  bindEvents(container);
}

function bindEvents(container) {
  // Theme toggle
  container.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-theme]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    });
  });

  // Test beep
  container.querySelector('#btn-test-beep')?.addEventListener('click', () => {
    const vol = parseFloat(container.querySelector('#beep-volume')?.value ?? 0.7);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (_) {}
  });

  // Seed demo data
  container.querySelector('#btn-seed-demo-settings')?.addEventListener('click', async () => {
    try {
      const res = await window.api.seedDemoData();
      if (res.success) {
        toast.success('Sampel Data Berhasil Dibuat', `${res.data.createdCount} barang gudang sampel telah dimasukkan.`);
      } else {
        toast.error('Gagal', res.error.message);
      }
    } catch (err) {
      toast.error('Error', err.message);
    }
  });

  // Open data dir
  container.querySelector('#btn-open-data-dir')?.addEventListener('click', () => {
    window.api.openDataDir();
  });

  // Save settings
  container.querySelector('#btn-save-settings')?.addEventListener('click', async () => {
    const updates = {};

    const themeDark = container.querySelector('#theme-dark');
    updates['app.theme'] = themeDark?.classList.contains('active') ? 'dark' : 'light';

    const beep = container.querySelector('#beep-enabled');
    updates['scanner.beep'] = beep?.checked ?? true;

    const vol = container.querySelector('#beep-volume');
    updates['scanner.beep_volume'] = parseFloat(vol?.value ?? 0.7);

    const minQty = container.querySelector('#min-qty-default');
    updates['stock.min_qty_default'] = parseInt(minQty?.value ?? 5);

    const gridSizeEl = container.querySelector('#grid-size-select');
    updates['display.grid_size'] = gridSizeEl?.value ?? 'medium';

    try {
      const res = await window.api.updateSettings(updates);
      if (res.success) {
        toast.success('Pengaturan Disimpan', 'Semua perubahan berhasil disimpan ke database.');
      } else {
        toast.error('Gagal Menyimpan', res.error?.message || 'Terjadi kesalahan');
      }
    } catch (err) {
      toast.error('Error', err.message);
    }
  });
}

function renderSection(title, icon, content) {
  return `
    <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-6);box-shadow:var(--shadow-sm)">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5)">
        <span class="icon" style="color:var(--color-accent)">${icon}</span>
        <span style="font-size:var(--text-md);font-weight:600">${title}</span>
      </div>
      ${content}
    </div>
  `;
}
