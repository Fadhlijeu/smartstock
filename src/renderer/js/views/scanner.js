/**
 * scanner.js — Scanner View (M0 placeholder, diimplementasi penuh di M3)
 */

import { toast } from '../components/toast.js';

export async function mount(container) {
  container.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Scanner</h2>
      <div style="display:flex;gap:var(--space-2)">
        <div class="toggle">
          <button class="toggle__option active" id="mode-hid">USB Scanner</button>
          <button class="toggle__option" id="mode-webcam">Kamera</button>
          <button class="toggle__option" id="mode-manual">Manual</button>
        </div>
      </div>
    </div>

    <!-- Scan bar besar -->
    <div class="scan-bar" style="border-radius:var(--radius-xl);padding:var(--space-5) var(--space-6);margin-bottom:var(--space-6)">
      <span class="icon icon--xl scan-bar__icon" style="font-size:32px">barcode_scanner</span>
      <input type="text" id="scan-main-input" placeholder="Fokus di sini, lalu scan barcode..." autocomplete="off" spellcheck="false" style="font-size:var(--text-xl)">
      <div class="direction-toggle">
        <button class="direction-btn active-in" id="scan-dir-in">▲ IN</button>
        <button class="direction-btn" id="scan-dir-out">▼ OUT</button>
      </div>
    </div>

    <!-- Last scans placeholder -->
    <div style="display:grid;grid-template-columns:1fr 320px;gap:var(--space-6)">
      <div>
        <div class="section-header" style="margin-bottom:var(--space-3)">
          <span style="font-size:var(--text-md);font-weight:600;color:var(--color-ink-secondary)">Scan Terakhir</span>
        </div>
        <div class="empty-state" style="padding:var(--space-10)">
          <span class="icon icon--xl">receipt_long</span>
          <h3>Belum ada scan</h3>
          <p>Riwayat scan akan muncul di sini setelah kamu mulai scan barang.</p>
        </div>
      </div>

      <div>
        <div style="font-size:var(--text-md);font-weight:600;color:var(--color-ink-secondary);margin-bottom:var(--space-3)">Status Scanner</div>
        <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-5)">
          <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            ${renderStatusRow('Mode', 'USB HID Scanner', 'usb')}
            ${renderStatusRow('Status', 'Siap — Menunggu scan', 'check_circle', 'ok')}
            ${renderStatusRow('Arah', 'IN (masuk)', 'login', 'ok')}
            ${renderStatusRow('Operator', '—', 'person')}
          </div>
        </div>

        <div style="margin-top:var(--space-4);font-size:var(--text-md);font-weight:600;color:var(--color-ink-secondary);margin-bottom:var(--space-3)">Milestone 3</div>
        <div style="background:var(--color-paper-1);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-5)">
          <p style="font-size:var(--text-sm);color:var(--color-ink-muted);line-height:1.7">
            Scanner penuh akan aktif di <strong>Milestone 3</strong>:<br>
            USB HID buffer · Webcam QR reader · Manual input · Validasi stock · Audio feedback
          </p>
        </div>
      </div>
    </div>
  `;

  // Auto-focus scan input
  const scanInput = container.querySelector('#scan-main-input');
  const scanBar = container.querySelector('.scan-bar');
  if (scanInput) {
    setTimeout(() => scanInput.focus(), 100);
    scanInput.addEventListener('focus', () => scanBar.classList.add('scan-bar--active'));
    scanInput.addEventListener('blur', () => scanBar.classList.remove('scan-bar--active'));
    scanInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && scanInput.value.trim()) {
        toast.info('Scanner', `Input: ${scanInput.value} — Akan diproses di M3`, 2000);
        scanInput.value = '';
      }
    });
  }

  // Direction toggle
  const btnIn = container.querySelector('#scan-dir-in');
  const btnOut = container.querySelector('#scan-dir-out');
  if (btnIn && btnOut) {
    btnIn.addEventListener('click', () => {
      btnIn.classList.add('active-in');
      btnOut.classList.remove('active-out');
    });
    btnOut.addEventListener('click', () => {
      btnOut.classList.add('active-out');
      btnIn.classList.remove('active-in');
    });
  }

  // Mode toggle
  const modes = container.querySelectorAll('#mode-hid, #mode-webcam, #mode-manual');
  modes.forEach((btn) => {
    btn.addEventListener('click', () => {
      modes.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      toast.info('Mode Scanner', `${btn.textContent} dipilih — Akan aktif di M3`, 2000);
    });
  });
}

function renderStatusRow(label, value, icon, colorVariant) {
  const iconColor = colorVariant === 'ok' ? 'var(--color-status-ok)' : 'var(--color-ink-muted)';
  return `
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:var(--text-sm);color:var(--color-ink-muted)">${label}</span>
      <div style="display:flex;align-items:center;gap:var(--space-2)">
        <span class="icon icon--sm" style="color:${iconColor}">${icon}</span>
        <span style="font-size:var(--text-sm);color:var(--color-ink-primary)">${value}</span>
      </div>
    </div>
  `;
}
