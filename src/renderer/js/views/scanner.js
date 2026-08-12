/**
 * scanner.js — Scanner & Live Transactions View (M3 Full)
 * Fitur:
 * - USB HID keyboard buffer listener (input bar)
 * - Manual QR ID / Serial Number input
 * - Transaksi IN/OUT
 * - Audio feedback (beep)
 * - Scan history (last 10)
 */

import { toast } from '../components/toast.js';
import { openQRModal } from '../components/qr-modal.js';

// ─── STATE ────────────────────────────────────────────────────────────────────
let scanHistory = [];      // Array of recent scan results
let scanMode = 'OUT';      // 'IN' | 'OUT'
let isProcessing = false;  // Debounce concurrent scans
let hidBuffer = '';        // USB HID keyboard buffer
let hidTimer = null;       // Timer untuk flush buffer

// ─── AUDIO ────────────────────────────────────────────────────────────────────
function beep(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Error: dua nada pendek
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (_) {
    // Audio context tidak tersedia, skip
  }
}

// ─── MOUNT ───────────────────────────────────────────────────────────────────
export async function mount(container) {
  container.innerHTML = renderShell();
  bindEvents(container);
  loadRecentHistory(container);
  focusScanInput(container);
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function renderShell() {
  return `
    <div class="section-header">
      <h2 class="section-title">Scanner</h2>
      <div style="font-size:var(--text-sm);color:var(--color-ink-muted)">
        Scan barcode/QR atau ketik QR ID / Serial Number
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 360px;gap:var(--space-6);align-items:start">

      <!-- Main scan area -->
      <div>

        <!-- Mode toggle -->
        <div style="display:flex;background:var(--color-paper-base);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-1);gap:var(--space-1);margin-bottom:var(--space-5);width:fit-content">
          <button class="btn btn--sm scan-mode-btn ${scanMode === 'OUT' ? 'btn--primary' : 'btn--ghost'}" data-mode="OUT"
            style="${scanMode === 'OUT' ? '' : 'color:var(--color-ink-secondary)'}">
            <span class="icon icon--sm">logout</span> KELUAR (OUT)
          </button>
          <button class="btn btn--sm scan-mode-btn ${scanMode === 'IN' ? 'btn--primary' : 'btn--ghost'}" data-mode="IN"
            style="${scanMode === 'IN' ? '' : 'color:var(--color-ink-secondary)'}">
            <span class="icon icon--sm">login</span> MASUK (IN)
          </button>
        </div>

        <!-- Scan input card -->
        <div style="
          background:var(--color-paper-1);
          border:2px solid ${scanMode === 'OUT' ? 'var(--color-status-out)' : 'var(--color-status-ok)'};
          border-radius:var(--radius-xl);
          padding:var(--space-8);
          text-align:center;
          margin-bottom:var(--space-6);
          transition:border-color 0.2s;
        " id="scan-card">

          <div class="icon" style="font-size:64px;color:${scanMode === 'OUT' ? 'var(--color-status-out)' : 'var(--color-status-ok)'};margin-bottom:var(--space-4);display:block" id="scan-mode-icon">
            ${scanMode === 'OUT' ? 'qr_code_scanner' : 'add_circle'}
          </div>

          <div style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--space-2);color:${scanMode === 'OUT' ? 'var(--color-status-out)' : 'var(--color-status-ok)'}">
            ${scanMode === 'OUT' ? 'MODE KELUAR' : 'MODE MASUK'}
          </div>
          <div style="font-size:var(--text-sm);color:var(--color-ink-muted);margin-bottom:var(--space-6)">
            Arahkan scanner ke QR Code atau ketik manual di bawah
          </div>

          <!-- Hidden input untuk HID -->
          <input type="text" id="scan-input-hid" aria-label="Scan input"
            style="position:absolute;opacity:0;width:1px;height:1px;pointer-events:none"
            autocomplete="off" tabindex="-1">

          <!-- Manual input -->
          <div style="display:flex;gap:var(--space-3);max-width:400px;margin:0 auto">
            <input type="text" class="form-input form-input--mono" id="scan-input-manual"
              placeholder="Ketik QR ID atau Serial Number..."
              autocomplete="off" style="flex:1;font-size:var(--text-md)">
            <button class="btn btn--primary" id="btn-scan-manual" style="min-width:80px">
              <span class="icon icon--sm">send</span>
            </button>
          </div>

          <!-- Qty input (untuk transaksi qty > 1) -->
          <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-3);margin-top:var(--space-4)">
            <label style="font-size:var(--text-sm);color:var(--color-ink-muted)">Jumlah:</label>
            <input type="number" class="form-input" id="scan-qty" value="1" min="1" max="9999"
              style="width:80px;text-align:center">
            <span style="font-size:var(--text-sm);color:var(--color-ink-muted)">unit</span>
          </div>

        </div>

        <!-- Last scan result -->
        <div id="scan-result" hidden style="
          border-radius:var(--radius-xl);
          padding:var(--space-5);
          margin-bottom:var(--space-5);
          animation:slideUp 0.2s ease;
        "></div>

      </div>

      <!-- Right sidebar: scan history -->
      <div>
        <div style="font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-ink-muted);margin-bottom:var(--space-3)">
          Riwayat Scan Terakhir
        </div>
        <div id="scan-history-list" style="display:flex;flex-direction:column;gap:var(--space-2)">
          <div style="text-align:center;padding:var(--space-6);color:var(--color-ink-muted);font-size:var(--text-sm)">
            Belum ada scan
          </div>
        </div>
      </div>

    </div>
  `;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function bindEvents(container) {
  // Mode toggle
  container.querySelectorAll('.scan-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      scanMode = btn.dataset.mode;
      // Re-mount untuk update warna & icon
      mount(container);
    });
  });

  // Manual input
  const manualInput = container.querySelector('#scan-input-manual');
  const sendBtn = container.querySelector('#btn-scan-manual');

  if (sendBtn) {
    sendBtn.addEventListener('click', () => processManualInput(container));
  }
  if (manualInput) {
    manualInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); processManualInput(container); }
    });
  }

  // USB HID keyboard buffer listener
  setupHIDListener(container);
}

function focusScanInput(container) {
  // Focus ke hidden input supaya HID scanner langsung ter-capture
  const hidInput = container.querySelector('#scan-input-hid');
  if (hidInput) hidInput.focus();
}

// ─── HID LISTENER ─────────────────────────────────────────────────────────────
function setupHIDListener(container) {
  // USB barcode scanner mengirim karakter satu per satu dengan cepat,
  // lalu mengakhiri dengan Enter (keyCode 13).
  // Kita buffer semua input dan flush saat Enter atau timeout.

  const onKeyDown = (e) => {
    // Skip jika sedang di input manual
    if (document.activeElement === container.querySelector('#scan-input-manual') ||
        document.activeElement === container.querySelector('#scan-qty')) return;

    if (e.key === 'Enter' && hidBuffer.length > 0) {
      e.preventDefault();
      const value = hidBuffer.trim();
      hidBuffer = '';
      clearTimeout(hidTimer);
      if (value) processCode(value, container);
      return;
    }

    // Karakter printable
    if (e.key.length === 1) {
      hidBuffer += e.key;
      clearTimeout(hidTimer);
      // Auto-flush setelah 80ms tanpa input baru (scanner terlalu lambat)
      hidTimer = setTimeout(() => {
        if (hidBuffer.length >= 3) {
          const value = hidBuffer.trim();
          hidBuffer = '';
          processCode(value, container);
        } else {
          hidBuffer = '';
        }
      }, 80);
    }
  };

  document.addEventListener('keydown', onKeyDown);

  // Cleanup saat container di-unmount (route change)
  const obs = new MutationObserver(() => {
    if (!document.contains(container)) {
      document.removeEventListener('keydown', onKeyDown);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// ─── PROCESS SCAN ─────────────────────────────────────────────────────────────
async function processManualInput(container) {
  const input = container.querySelector('#scan-input-manual');
  const value = (input?.value || '').trim();
  if (!value) return;
  if (input) input.value = '';
  await processCode(value, container);
}

/**
 * Proses kode QR atau serial number
 * @param {string} code - QR ID (QR-2026-0001) atau serial number atau JSON payload
 * @param {HTMLElement} container
 */
async function processCode(code, container) {
  if (isProcessing) return;
  isProcessing = true;

  const qty = parseInt(container.querySelector('#scan-qty')?.value || '1') || 1;

  try {
    // Coba parse sebagai JSON payload (dari QR code yang di-scan)
    let qrId = null;
    let serialNumber = null;

    if (code.startsWith('{')) {
      try {
        const payload = JSON.parse(code);
        qrId = payload.qrId;
        serialNumber = payload.sn;
      } catch (_) { /* bukan JSON valid */ }
    }

    if (!qrId) {
      // Cek apakah format QR ID (QR-YYYY-NNNN)
      if (/^QR-\d{4}-\d{4,}$/i.test(code)) {
        qrId = code.toUpperCase();
      } else {
        // Treat sebagai serial number
        serialNumber = code;
      }
    }

    // Lookup part
    let partRes;
    if (qrId) {
      partRes = await window.api.getPartByQrId(qrId);
    } else {
      partRes = await window.api.getPartBySerialNumber(serialNumber);
    }

    if (!partRes || !partRes.success) {
      showScanResult(container, { success: false, code, error: 'Barang tidak ditemukan di database' });
      beep('error');
      addToHistory({ success: false, code, error: 'Tidak ditemukan', timestamp: new Date() }, container);
      return;
    }

    const part = partRes.data;

    // Validasi stok untuk OUT
    if (scanMode === 'OUT' && part.currentQty < qty) {
      showScanResult(container, {
        success: false, part, code,
        error: `Stok tidak cukup: sisa ${part.currentQty} ${part.unit}, diminta ${qty}`,
      });
      beep('error');
      addToHistory({ success: false, part, error: 'Stok kurang', timestamp: new Date() }, container);
      return;
    }

    // Buat transaksi
    const txRes = await window.api.createTransaction({
      partId: part.id,
      qrId: part.qrId,
      direction: scanMode,
      quantity: qty,
      scanMethod: 'manual',
    });

    if (!txRes.success) {
      showScanResult(container, { success: false, part, code, error: txRes.error.message });
      beep('error');
      return;
    }

    const newQty = scanMode === 'OUT' ? part.currentQty - qty : part.currentQty + qty;
    beep('success');
    showScanResult(container, { success: true, part, qty, newQty, direction: scanMode });
    addToHistory({ success: true, part, qty, direction: scanMode, timestamp: new Date() }, container);

    // Flash scan card
    const card = container.querySelector('#scan-card');
    if (card) {
      card.style.animation = 'scanFlash 0.4s ease';
      setTimeout(() => { card.style.animation = ''; }, 400);
    }

  } catch (err) {
    showScanResult(container, { success: false, code, error: err.message });
    beep('error');
    toast.error('Scan Error', err.message);
  } finally {
    isProcessing = false;
    focusScanInput(container);
  }
}

// ─── RESULT UI ────────────────────────────────────────────────────────────────
function showScanResult(container, result) {
  const el = container.querySelector('#scan-result');
  if (!el) return;

  el.hidden = false;

  if (result.success) {
    const { part, qty, newQty, direction } = result;
    const isOut = direction === 'OUT';
    const color = isOut ? 'var(--color-status-out)' : 'var(--color-status-ok)';
    const bgColor = isOut ? 'oklch(30% 0.04 25 / 0.3)' : 'oklch(30% 0.05 145 / 0.3)';

    el.style.cssText = `
      border-radius:var(--radius-xl);
      padding:var(--space-5);
      margin-bottom:var(--space-5);
      background:${bgColor};
      border:1px solid ${color};
      animation:slideUp 0.2s ease;
    `;

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-4)">
        <span class="icon" style="font-size:40px;color:${color}">${isOut ? 'remove_circle' : 'add_circle'}</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:var(--text-lg)">${escHtml(part.description)}</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-ink-muted)">${escHtml(part.qrId)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${isOut ? '−' : '+'} ${qty} ${escHtml(part.unit)}</div>
          <div style="font-size:var(--text-2xl);font-weight:700;font-variant-numeric:tabular-nums;color:${color}">${newQty}</div>
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">sisa</div>
        </div>
      </div>
    `;
  } else {
    el.style.cssText = `
      border-radius:var(--radius-xl);
      padding:var(--space-5);
      margin-bottom:var(--space-5);
      background:oklch(25% 0.04 25 / 0.3);
      border:1px solid var(--color-status-out);
      animation:slideUp 0.2s ease;
    `;

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-4)">
        <span class="icon" style="font-size:40px;color:var(--color-status-out)">error</span>
        <div>
          <div style="font-weight:600;color:var(--color-status-out)">Scan Gagal</div>
          <div style="font-size:var(--text-sm);color:var(--color-ink-secondary)">${escHtml(result.error)}</div>
          ${result.part ? `<div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink-muted);margin-top:4px">${escHtml(result.part.qrId)}</div>` : ''}
        </div>
      </div>
    `;
  }
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function addToHistory(entry, container) {
  scanHistory.unshift(entry);
  if (scanHistory.length > 10) scanHistory.pop();
  renderHistory(container);
}

async function loadRecentHistory(container) {
  try {
    const res = await window.api.getTransactions({ limit: 10, sortDir: 'DESC' });
    if (res?.success && res.data) {
      scanHistory = res.data.map((tx) => ({
        success: true,
        part: { description: tx.partDescription || tx.partId, qrId: tx.qrId, unit: tx.unit || 'pcs' },
        qty: tx.quantity,
        direction: tx.direction,
        timestamp: new Date(tx.scannedAt),
        txId: tx.id,
      }));
      renderHistory(container);
    }
  } catch (_) { /* skip */ }
}

function renderHistory(container) {
  const list = container.querySelector('#scan-history-list');
  if (!list) return;

  if (scanHistory.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:var(--space-6);color:var(--color-ink-muted);font-size:var(--text-sm)">
        Belum ada scan
      </div>
    `;
    return;
  }

  list.innerHTML = scanHistory.map((entry, i) => {
    if (!entry.success) {
      return `
        <div style="
          background:var(--color-paper-1);border:1px solid var(--color-paper-border);
          border-radius:var(--radius-md);padding:var(--space-3);opacity:0.7;
          display:flex;align-items:center;gap:var(--space-2)
        ">
          <span class="icon icon--sm" style="color:var(--color-status-out)">cancel</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--text-sm);color:var(--color-status-out);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${escHtml(entry.error)}
            </div>
            <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${formatTime(entry.timestamp)}</div>
          </div>
        </div>
      `;
    }

    const isOut = entry.direction === 'OUT';
    const color = isOut ? 'var(--color-status-out)' : 'var(--color-status-ok)';

    return `
      <div style="
        background:var(--color-paper-1);border:1px solid var(--color-paper-border);
        border-radius:var(--radius-md);padding:var(--space-3);
        display:flex;align-items:center;gap:var(--space-2);
        ${i === 0 ? 'border-color:' + color + ';' : ''}
      ">
        <span class="icon icon--sm" style="color:${color}">${isOut ? 'logout' : 'login'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--text-sm);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escHtml(entry.part?.description || '—')}
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${formatTime(entry.timestamp)}</div>
        </div>
        <div style="font-size:var(--text-sm);font-variant-numeric:tabular-nums;font-weight:600;color:${color};white-space:nowrap">
          ${isOut ? '−' : '+'}${entry.qty}
        </div>
      </div>
    `;
  }).join('');
}

// ─── CSS FLASH ANIMATION ──────────────────────────────────────────────────────
// Inject ke <style> jika belum ada
(function injectScanFlash() {
  if (document.querySelector('#scan-flash-style')) return;
  const style = document.createElement('style');
  style.id = 'scan-flash-style';
  style.textContent = `
    @keyframes scanFlash {
      0%, 100% { transform: scale(1); }
      30% { transform: scale(1.01); }
      60% { transform: scale(0.99); }
    }
  `;
  document.head.appendChild(style);
})();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatTime(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
