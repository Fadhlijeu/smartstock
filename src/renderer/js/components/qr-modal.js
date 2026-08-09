/**
 * qr-modal.js — QR Code Preview Modal
 * Tampilkan QR dari part, dengan opsi download PNG/SVG.
 */

import { toast } from './toast.js';

/**
 * Buka modal QR untuk sebuah part
 * @param {Object} part - Part object dengan qrId, description, serialNumber
 */
export async function openQRModal(part) {
  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'qr-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:var(--z-overlay);
    background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
    display:flex;align-items:center;justify-content:center;
    animation:fadeIn 0.15s ease;
  `;

  overlay.innerHTML = `
    <div id="qr-modal-box" style="
      background:var(--color-paper-1);
      border:1px solid var(--color-paper-border);
      border-radius:var(--radius-xl);
      width:380px;max-width:92vw;
      padding:var(--space-6);
      box-shadow:0 24px 80px rgba(0,0,0,0.5);
      animation:slideUp 0.2s ease;
    ">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4)">
        <div>
          <div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.08em;color:var(--color-accent);margin-bottom:4px">QR Code</div>
          <h3 style="margin:0;font-size:var(--text-lg);font-weight:600;line-height:1.3">${escHtml(part.description || '')}</h3>
        </div>
        <button id="qr-modal-close" class="btn btn--ghost btn--icon" title="Tutup">
          <span class="icon">close</span>
        </button>
      </div>

      <!-- QR Image area -->
      <div id="qr-image-container" style="
        display:flex;align-items:center;justify-content:center;
        background:white;border-radius:var(--radius-lg);
        padding:var(--space-4);margin-bottom:var(--space-4);
        min-height:280px;
      ">
        <div class="spinner spinner--lg"></div>
      </div>

      <!-- Part info -->
      <div style="
        display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);
        padding:var(--space-3) var(--space-4);
        background:var(--color-paper-base);border-radius:var(--radius-md);
        margin-bottom:var(--space-4);
      ">
        <div>
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-bottom:2px">QR ID</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-sm);font-weight:600">${escHtml(part.qrId || '')}</div>
        </div>
        <div>
          <div style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-bottom:2px">Serial Number</div>
          <div style="font-family:var(--font-mono);font-size:var(--text-sm)">${escHtml(part.serialNumber || '')}</div>
        </div>
      </div>

      <!-- Size selector -->
      <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4)">
        <span style="font-size:var(--text-sm);color:var(--color-ink-muted)">Ukuran:</span>
        ${[128, 256, 512].map((s) => `
          <button class="btn btn--ghost btn--sm qr-size-btn" data-size="${s}"
            style="${s === 256 ? 'background:var(--color-accent-dim);color:var(--color-accent);' : ''}">
            ${s}px
          </button>
        `).join('')}
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn--secondary" id="qr-download-png" style="flex:1">
          <span class="icon icon--sm">download</span> PNG
        </button>
        <button class="btn btn--ghost" id="qr-download-svg" style="flex:1">
          <span class="icon icon--sm">download</span> SVG
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // State
  let currentDataUrl = null;
  let currentSvg = null;
  let currentSize = 256;

  // Load QR
  async function loadQR(size = 256) {
    const container = overlay.querySelector('#qr-image-container');
    container.innerHTML = '<div class="spinner spinner--lg"></div>';

    try {
      const res = await window.api.qrGenerateForPart(part.id);
      if (!res.success) throw new Error(res.error.message);

      currentDataUrl = res.data.dataUrl;
      currentSvg = res.data.svg;

      // Re-generate dengan size yang diminta jika berbeda
      if (size !== 256) {
        const r2 = await window.api.qrGetDataUrl(res.data.payload, size);
        if (r2.success) currentDataUrl = r2.data.dataUrl;
      }

      container.innerHTML = `
        <div style="text-align:center">
          <img src="${currentDataUrl}" width="${size}" height="${size}"
            style="image-rendering:pixelated;border-radius:var(--radius-sm)"
            alt="QR Code ${escHtml(part.qrId)}">
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="padding:var(--space-4)">
          <span class="icon icon--xl" style="color:var(--color-status-out)">qr_code_scanner</span>
          <p style="font-size:var(--text-sm);color:var(--color-ink-muted)">${escHtml(err.message)}</p>
        </div>
      `;
    }
  }

  loadQR(currentSize);

  // Bind events
  overlay.querySelector('#qr-modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Size buttons
  overlay.querySelectorAll('.qr-size-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      overlay.querySelectorAll('.qr-size-btn').forEach((b) => {
        b.style.background = '';
        b.style.color = '';
      });
      btn.style.background = 'var(--color-accent-dim)';
      btn.style.color = 'var(--color-accent)';
      currentSize = parseInt(btn.dataset.size);
      await loadQR(currentSize);
    });
  });

  // Download PNG
  overlay.querySelector('#qr-download-png').addEventListener('click', () => {
    if (!currentDataUrl) { toast.warning('Tunggu', 'QR belum selesai di-generate'); return; }
    const a = document.createElement('a');
    a.href = currentDataUrl;
    a.download = `QR_${part.qrId || part.serialNumber}_${currentSize}px.png`;
    a.click();
    toast.success('Download', `QR ${part.qrId} berhasil didownload`);
  });

  // Download SVG
  overlay.querySelector('#qr-download-svg').addEventListener('click', () => {
    if (!currentSvg) { toast.warning('Tunggu', 'QR belum selesai di-generate'); return; }
    const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${part.qrId || part.serialNumber}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast.success('Download', `QR SVG ${part.qrId} berhasil didownload`);
  });

  // Keyboard
  const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
