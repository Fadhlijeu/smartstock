/**
 * app.js — Main App Controller untuk SAP StockMon
 * Inisialisasi: theme, sidebar, keyboard shortcuts, router, real-time events.
 */

import { initRouter, navigate } from './router.js';
import { state } from './state.js';
import { toast } from './components/toast.js';

// ─── INIT ────────────────────────────────────────────────────────

async function init() {
  // 1. Load settings dari DB
  await loadSettings();

  // 2. Apply theme
  applyTheme(state.get('settings')['app.theme'] || 'dark');

  // 3. Setup sidebar
  setupSidebar();

  // 4. Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // 5. Setup real-time events dari main process
  setupRealtimeEvents();

  // 6. Init router (render halaman pertama)
  initRouter();

  // 7. Load KPI untuk sidebar badge
  refreshSidebarBadges();
}

// ─── SETTINGS ────────────────────────────────────────────────────

async function loadSettings() {
  try {
    const res = await window.api.getSettings();
    if (res.success) {
      state.setSilent('settings', res.data);

      // Restore sidebar state
      const collapsed = res.data['sidebar.collapsed'] === true;
      if (collapsed) {
        document.getElementById('sidebar')?.classList.add('collapsed');
        state.setSilent('sidebarCollapsed', true);
      }
    }
  } catch (err) {
    console.error('[App] Failed to load settings:', err);
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// ─── SIDEBAR ─────────────────────────────────────────────────────

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      state.update('sidebarCollapsed', isCollapsed);

      // Persist ke settings
      window.api.updateSettings({ 'sidebar.collapsed': isCollapsed });

      // Update toggle icon
      const icon = toggleBtn.querySelector('.icon');
      if (icon) icon.textContent = isCollapsed ? 'chevron_right' : 'chevron_left';
    });
  }

  // Nav item clicks
  document.querySelectorAll('.nav-item[data-route]').forEach((item) => {
    item.addEventListener('click', () => {
      navigate(item.dataset.route);
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(item.dataset.route);
      }
    });
  });
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────────

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Jangan trigger saat typing di input
    const target = e.target;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Global shortcuts (aktif selalu)
    if (e.key === 'Escape') {
      // Handled by modal.js
      return;
    }

    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          // Command palette — M2+
          toast.info('Command Palette', 'Akan tersedia di versi berikutnya', 2000);
          return;
        case 'n':
          e.preventDefault();
          // Jika sudah di parts, langsung buka form
          if (window.location.hash === '#parts') {
            document.querySelector('#btn-add-part')?.click();
          } else {
            window.location.hash = '#parts';
            setTimeout(() => document.querySelector('#btn-add-part')?.click(), 400);
          }
          return;
        case 'i':
          e.preventDefault();
          navigate('#scanner');
          // Set direction IN
          return;
        case 'o':
          e.preventDefault();
          navigate('#scanner');
          // Set direction OUT
          return;
        case 'e':
          e.preventDefault();
          navigate('#reports');
          return;
      }
      return;
    }

    // Non-modifier shortcuts (jangan trigger saat typing)
    if (isTyping) return;

    // Navigation shortcuts: G + key
    if (e.key === 'g') {
      setupSequentialShortcut(() => {
        document.addEventListener('keydown', (e2) => {
          switch (e2.key.toLowerCase()) {
            case 'd': navigate('#dashboard'); break;
            case 'p': navigate('#parts'); break;
            case 'h': navigate('#history'); break;
            case 'r': navigate('#reports'); break;
            case 's': navigate('#settings'); break;
          }
        }, { once: true });
      });
      return;
    }

    // Search focus
    if (e.key === '/') {
      e.preventDefault();
      const searchInput = document.querySelector('#search-input');
      if (searchInput) searchInput.focus();
    }

    // Shortcut help
    if (e.key === '?') {
      showShortcutsHelp();
    }
  });
}

function setupSequentialShortcut(callback) {
  // Timeout 1.5 detik untuk sequential shortcut (G D, G P, dll)
  const timer = setTimeout(() => {}, 1500);
  callback();
  clearTimeout(timer);
}

function showShortcutsHelp() {
  import('./components/modal.js').then(({ openModal }) => {
    openModal({
      title: 'Keyboard Shortcuts',
      body: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6)">
          <div>
            <div style="font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-ink-muted);margin-bottom:var(--space-3)">Global</div>
            ${renderShortcut('Ctrl+K', 'Command palette')}
            ${renderShortcut('Ctrl+N', 'Tambah barang baru')}
            ${renderShortcut('Ctrl+I', 'Scanner — mode IN')}
            ${renderShortcut('Ctrl+O', 'Scanner — mode OUT')}
            ${renderShortcut('Ctrl+E', 'Export dialog')}
            ${renderShortcut('Escape', 'Tutup modal')}
            ${renderShortcut('?', 'Tampilkan shortcut ini')}
          </div>
          <div>
            <div style="font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-ink-muted);margin-bottom:var(--space-3)">Navigasi</div>
            ${renderShortcut('G D', 'Go to Dashboard')}
            ${renderShortcut('G P', 'Go to Parts')}
            ${renderShortcut('G H', 'Go to History')}
            ${renderShortcut('G R', 'Go to Reports')}
            ${renderShortcut('G S', 'Go to Settings')}
            ${renderShortcut('/', 'Focus search bar')}
          </div>
        </div>
      `,
      size: 'wide',
    });
  });
}

function renderShortcut(keys, description) {
  const keyHtml = keys.split('+').map((k) =>
    `<kbd style="background:var(--color-paper-3);border:1px solid var(--color-paper-border);border-radius:4px;padding:1px 6px;font-family:var(--font-mono);font-size:var(--text-xs)">${k}</kbd>`
  ).join('<span style="margin:0 2px;color:var(--color-ink-muted)">+</span>');

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-paper-divider)">
      <span style="font-size:var(--text-sm);color:var(--color-ink-secondary)">${description}</span>
      <div style="display:flex;align-items:center;gap:2px">${keyHtml}</div>
    </div>
  `;
}

// ─── REAL-TIME EVENTS ─────────────────────────────────────────────

function setupRealtimeEvents() {
  // Stock updated (dari scanner di M3)
  window.api.onStockUpdated((data) => {
    refreshSidebarBadges();
    // Dashboard card update ditangani di dashboard.js
  });

  // Scan error
  window.api.onScanError((data) => {
    toast.error('Scan Error', data.message);
  });

  // Import progress
  window.api.onImportProgress((data) => {
    console.log('[Import Progress]', data);
    // Toast akan ditangani di parts view
  });

  // Menu events dari main process
  window.addEventListener('menu:importCSV', () => navigate('#parts'));
  window.addEventListener('menu:exportExcel', () => navigate('#reports'));
  window.addEventListener('menu:showShortcuts', showShortcutsHelp);
}

// ─── SIDEBAR BADGES ──────────────────────────────────────────────

async function refreshSidebarBadges() {
  try {
    const res = await window.api.getKpiStats();
    if (!res.success) return;

    const { outCount, lowCount, reviewCount } = res.data;
    const alertCount = outCount + lowCount + reviewCount;

    const badge = document.getElementById('sidebar-alert-badge');
    if (badge) {
      if (alertCount > 0) {
        badge.textContent = alertCount > 99 ? '99+' : alertCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('[App] Failed to refresh badges:', err);
  }
}

// ─── START ───────────────────────────────────────────────────────

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  init().catch((err) => {
    console.error('[App] Fatal init error:', err);
    document.getElementById('page-content').innerHTML = `
      <div class="empty-state">
        <span class="icon icon--2xl" style="color:var(--color-error)">error</span>
        <h3>Gagal memulai aplikasi</h3>
        <p>${err.message}</p>
      </div>
    `;
  });
});
