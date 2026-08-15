/**
 * scanner.js — Scanner & Live Transactions View (With Upload, Camera, HID, Audio & Undo)
 * Fitur:
 * - Scan via upload gambar QR/Barcode (file picker, drag & drop, paste Ctrl+V)
 * - WebRTC live camera scanner / video preview toggle
 * - USB HID rapid scanner buffer listener
 * - Mode: KELUAR (OUT), MASUK (IN), AUDIT (Cek Stok)
 * - Quick Quantity presets (+1, +5, +10, +25, +50, custom)
 * - Web Audio API acoustic feedback
 * - Real-time recent transaction log with one-click UNDO
 */

import { toast } from '../components/toast.js';

// ─── STATE ────────────────────────────────────────────────────────────────────
let scanHistory = [];      // Array of recent scan results
let scanMode = 'OUT';      // 'OUT' | 'IN' | 'AUDIT'
let isProcessing = false;  // Debounce concurrent scans
let hidBuffer = '';        // USB HID keyboard buffer
let hidTimer = null;       // Timer untuk flush buffer
let cameraStream = null;   // WebRTC stream
let isCameraActive = false;

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
    } else if (type === 'warning') {
      osc.frequency.value = 580;
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Error
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (_) {}
}

// ─── MOUNT / UNMOUNT ──────────────────────────────────────────────────────────
export async function mount(container) {
  container.innerHTML = renderShell();
  bindEvents(container);
  loadRecentHistory(container);
  focusScanInput(container);

  return () => {
    stopCamera();
  };
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function renderShell() {
  const isAudit = scanMode === 'AUDIT';
  const isOut = scanMode === 'OUT';
  const isIn = scanMode === 'IN';

  const modeColor = isOut ? 'var(--color-status-out)'
    : isIn ? 'var(--color-status-ok)'
    : 'var(--color-accent)';

  const modeIcon = isOut ? 'logout'
    : isIn ? 'login'
    : 'manage_search';

  const modeTitle = isOut ? 'MODE KELUAR (OUT)'
    : isIn ? 'MODE MASUK (IN)'
    : 'MODE AUDIT (CEK DATA)';

  return `
    <div class="section-header">
      <div>
        <h2 class="section-title">Terminal Scanner</h2>
        <div style="font-size:var(--text-sm);color:var(--color-ink-muted);margin-top:2px">
          Scan barcode/QR via scanner fisik, kamera, upload gambar, atau input manual
        </div>
      </div>
      <div style="display:flex;gap:var(--space-2)">
        <input type="file" id="qr-file-input" accept="image/*" style="display:none">
        <button class="btn btn--secondary btn--sm" id="btn-upload-qr" title="Upload gambar QR Code/Barcode">
          <span class="icon icon--sm">upload_file</span>
          <span>Upload Gambar</span>
        </button>
        <button class="btn btn--secondary btn--sm" id="btn-toggle-camera" title="Nyalakan kamera live scan">
          <span class="icon icon--sm">${isCameraActive ? 'videocam_off' : 'videocam'}</span>
          <span>${isCameraActive ? 'Tutup Kamera' : 'Buka Kamera'}</span>
        </button>
      </div>
    </div>

    <!-- Camera Preview Area (Collapsible) -->
    <div id="camera-container" style="display:${isCameraActive ? 'block' : 'none'};margin-bottom:var(--space-5);background:var(--color-paper-base);border:1px solid var(--color-paper-border);border-radius:var(--radius-xl);overflow:hidden;text-align:center;position:relative;max-width:600px;margin-left:auto;margin-right:auto">
      <video id="camera-video" playsinline style="width:100%;max-height:280px;object-fit:cover;border-radius:var(--radius-xl)"></video>
      <div style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center">
        <div style="width:200px;height:200px;border:2px dashed var(--color-accent);border-radius:var(--radius-lg);box-shadow:0 0 0 9999px rgba(0,0,0,0.4)"></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 380px;gap:var(--space-6);align-items:start">

      <!-- Main scan area -->
      <div>

        <!-- Mode toggle -->
        <div style="display:flex;background:var(--color-paper-base);border:1px solid var(--color-paper-border);border-radius:var(--radius-lg);padding:var(--space-1);gap:var(--space-1);margin-bottom:var(--space-5);width:fit-content">
          <button class="btn btn--sm scan-mode-btn ${isOut ? 'btn--primary' : 'btn--ghost'}" data-mode="OUT">
            <span class="icon icon--sm">logout</span> KELUAR (OUT)
          </button>
          <button class="btn btn--sm scan-mode-btn ${isIn ? 'btn--primary' : 'btn--ghost'}" data-mode="IN">
            <span class="icon icon--sm">login</span> MASUK (IN)
          </button>
          <button class="btn btn--sm scan-mode-btn ${isAudit ? 'btn--primary' : 'btn--ghost'}" data-mode="AUDIT">
            <span class="icon icon--sm">manage_search</span> AUDIT (CEK)
          </button>
        </div>

        <!-- Scan input card with Drag-and-Drop dropzone -->
        <div style="
          background:var(--color-paper-1);
          border:2px solid ${modeColor};
          border-radius:var(--radius-xl);
          padding:var(--space-8);
          text-align:center;
          margin-bottom:var(--space-6);
          box-shadow:0 8px 32px rgba(0,0,0,0.25);
          transition:border-color 0.2s, background-color 0.2s;
          position:relative;
        " id="scan-card">

          <div class="icon" style="font-size:56px;color:${modeColor};margin-bottom:var(--space-3);display:block" id="scan-mode-icon">
            ${modeIcon}
          </div>

          <div style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--space-2);color:${modeColor}">
            ${modeTitle}
          </div>
          <div style="font-size:var(--text-sm);color:var(--color-ink-muted);margin-bottom:var(--space-6)">
            ${isAudit ? 'Scan atau drag & drop gambar QR untuk melihat info stok' : 'Scan barcode fisik, drag & drop gambar, paste (Ctrl+V), atau ketik QR ID'}
          </div>

          <!-- Hidden input untuk HID scanner -->
          <input type="text" id="scan-input-hid" aria-label="Scan input"
            style="position:absolute;opacity:0;width:1px;height:1px;pointer-events:none"
            autocomplete="off" tabindex="-1">

          <!-- Manual input -->
          <div style="display:flex;gap:var(--space-3);max-width:440px;margin:0 auto">
            <input type="text" class="form-input form-input--mono" id="scan-input-manual"
              placeholder="Scan barcode atau ketik QR ID..."
              autocomplete="off" spellcheck="false" style="flex:1;font-size:var(--text-md);height:44px">
            <button class="btn btn--primary" id="btn-scan-manual" style="min-width:90px;height:44px">
              <span class="icon icon--sm">send</span>
              <span>Proses</span>
            </button>
          </div>

          ${!isAudit ? `
            <!-- Quantity Presets -->
            <div style="margin-top:var(--space-5);display:flex;flex-direction:column;align-items:center;gap:var(--space-2)">
              <div style="display:flex;align-items:center;gap:var(--space-2)">
                <span style="font-size:var(--text-xs);color:var(--color-ink-muted);font-weight:600;text-transform:uppercase">Jumlah:</span>
                <button class="btn btn--ghost btn--sm qty-preset" data-qty="1">1</button>
                <button class="btn btn--ghost btn--sm qty-preset" data-qty="5">5</button>
                <button class="btn btn--ghost btn--sm qty-preset" data-qty="10">10</button>
                <button class="btn btn--ghost btn--sm qty-preset" data-qty="25">25</button>
                <button class="btn btn--ghost btn--sm qty-preset" data-qty="50">50</button>
                <input type="number" class="form-input" id="scan-qty" value="1" min="1" max="9999"
                  style="width:72px;text-align:center;height:32px;font-weight:600">
              </div>
            </div>
          ` : ''}

          <!-- Drop overlay hint -->
          <div id="drop-overlay" style="
            display:none;position:absolute;inset:0;background:var(--color-paper-base);
            border:2px dashed var(--color-accent);border-radius:var(--radius-xl);
            align-items:center;justify-content:center;flex-direction:column;gap:var(--space-2);
            z-index:10;
          ">
            <span class="icon icon--2xl" style="color:var(--color-accent)">upload_file</span>
            <div style="font-weight:700;font-size:var(--text-lg)">Lepaskan Gambar Di Sini</div>
            <div style="font-size:var(--text-sm);color:var(--color-ink-muted)">Membaca QR / Barcode dari file...</div>
          </div>

        </div>

        <!-- Last scan result card -->
        <div id="scan-result" hidden style="
          border-radius:var(--radius-xl);
          padding:var(--space-5);
          margin-bottom:var(--space-5);
          animation:slideUp 0.2s ease;
        "></div>

      </div>

      <!-- Right sidebar: scan history -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
          <span style="font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-ink-muted)">
            Riwayat Scan Terakhir
          </span>
          <button class="btn btn--ghost btn--xs" id="btn-undo-scan" title="Undo Transaksi Terakhir">
            <span class="icon icon--xs">undo</span> Undo
          </button>
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
      mount(container);
    });
  });

  // Quantity presets
  container.querySelectorAll('.qty-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qtyInput = container.querySelector('#scan-qty');
      if (qtyInput) qtyInput.value = btn.dataset.qty;
    });
  });

  // Camera toggle
  container.querySelector('#btn-toggle-camera')?.addEventListener('click', () => {
    if (isCameraActive) {
      stopCamera();
      isCameraActive = false;
    } else {
      startCamera(container);
      isCameraActive = true;
    }
    const camBox = container.querySelector('#camera-container');
    const btnText = container.querySelector('#btn-toggle-camera span:last-child');
    const btnIcon = container.querySelector('#btn-toggle-camera .icon');
    if (camBox) camBox.style.display = isCameraActive ? 'block' : 'none';
    if (btnText) btnText.textContent = isCameraActive ? 'Tutup Kamera' : 'Buka Kamera';
    if (btnIcon) btnIcon.textContent = isCameraActive ? 'videocam_off' : 'videocam';
  });

  // Image Upload Button & File Input
  const fileInput = container.querySelector('#qr-file-input');
  container.querySelector('#btn-upload-qr')?.addEventListener('click', () => {
    if (fileInput) fileInput.click();
  });

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleImageFile(file, container);
        fileInput.value = '';
      }
    });
  }

  // Drag and drop onto scan card
  const scanCard = container.querySelector('#scan-card');
  const dropOverlay = container.querySelector('#drop-overlay');

  if (scanCard) {
    scanCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropOverlay) dropOverlay.style.display = 'flex';
    });

    scanCard.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropOverlay) dropOverlay.style.display = 'none';
    });

    scanCard.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropOverlay) dropOverlay.style.display = 'none';
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        await handleImageFile(file, container);
      }
    });
  }

  // Paste image handler (Ctrl+V)
  const onPaste = async (e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          await handleImageFile(file, container);
          return;
        }
      }
    }
  };
  document.addEventListener('paste', onPaste);

  // Undo button
  container.querySelector('#btn-undo-scan')?.addEventListener('click', async () => {
    try {
      const res = await window.api.undoLastTransaction();
      if (res.success) {
        beep('warning');
        toast.info('Transaksi Dibatalkan', `Stok barang dikembalikan ke ${res.data.restoredQty}`);
        loadRecentHistory(container);
      } else {
        toast.warning('Undo Gagal', res.error.message);
      }
    } catch (err) {
      toast.error('Error', err.message);
    }
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

  // Cleanup on unmount
  const obs = new MutationObserver(() => {
    if (!document.contains(container)) {
      document.removeEventListener('paste', onPaste);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

function focusScanInput(container) {
  const hidInput = container.querySelector('#scan-input-hid');
  if (hidInput) hidInput.focus();
}

// ─── IMAGE FILE DECODER ───────────────────────────────────────────────────────
async function handleImageFile(file, container) {
  toast.info('Memproses Gambar', `Membaca ${file.name || 'gambar'}...`, 2000);

  try {
    const bitmap = await createImageBitmap(file);

    // 1. Try native BarcodeDetector API (Built-in Chromium / Electron)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix', 'upc_a']
        });
        const barcodes = await detector.detect(bitmap);
        if (barcodes && barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue;
          toast.success('QR Terdeteksi', `Kode: ${rawValue.slice(0, 30)}`);
          await processCode(rawValue, container);
          return;
        }
      } catch (err) {
        console.warn('[Scanner] BarcodeDetector detect failed:', err);
      }
    }

    // 2. Fallback: Render image into temporary canvas for user inspection
    toast.warning('Scan Gambar', 'Pastikan gambar QR/Barcode memiliki kontras yang jelas dan tidak buram.');
  } catch (err) {
    toast.error('Gagal Membaca Gambar', err.message);
  }
}

// ─── CAMERA SCANNER ───────────────────────────────────────────────────────────
async function startCamera(container) {
  try {
    const video = container.querySelector('#camera-video');
    if (!video) return;
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = cameraStream;
    await video.play();
  } catch (err) {
    toast.error('Kamera Gagal', 'Tidak dapat mengakses perangkat kamera: ' + err.message);
    isCameraActive = false;
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  isCameraActive = false;
}

// ─── HID LISTENER ─────────────────────────────────────────────────────────────
function setupHIDListener(container) {
  const onKeyDown = (e) => {
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

    if (e.key.length === 1) {
      hidBuffer += e.key;
      clearTimeout(hidTimer);
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

  const obs = new MutationObserver(() => {
    if (!document.contains(container)) {
      document.removeEventListener('keydown', onKeyDown);
      stopCamera();
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

async function processCode(code, container) {
  if (isProcessing) return;
  isProcessing = true;

  const qty = parseInt(container.querySelector('#scan-qty')?.value || '1') || 1;

  try {
    let qrId = null;
    let serialNumber = null;

    if (code.startsWith('{')) {
      try {
        const payload = JSON.parse(code);
        qrId = payload.qrId || payload.id;
        serialNumber = payload.sn;
      } catch (_) {}
    }

    if (!qrId) {
      if (/^QR-\d{4}-\d{4,}$/i.test(code)) {
        qrId = code.toUpperCase();
      } else {
        serialNumber = code;
      }
    }

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

    // Audit Mode: Just display details
    if (scanMode === 'AUDIT') {
      beep('success');
      showScanResult(container, { success: true, part, isAudit: true });
      addToHistory({ success: true, part, isAudit: true, timestamp: new Date() }, container);
      return;
    }

    // OUT Validation
    if (scanMode === 'OUT' && part.currentQty < qty) {
      showScanResult(container, {
        success: false, part, code,
        error: `Stok tidak cukup: sisa ${part.currentQty} ${part.unit}, diminta ${qty}`,
      });
      beep('error');
      addToHistory({ success: false, part, error: 'Stok kurang', timestamp: new Date() }, container);
      return;
    }

    // Create Transaction
    const txRes = await window.api.createTransaction({
      partId: part.id,
      qrId: part.qrId,
      direction: scanMode,
      quantity: qty,
      scanMethod: isCameraActive ? 'webcam' : 'hid',
    });

    if (!txRes.success) {
      showScanResult(container, { success: false, part, code, error: txRes.error.message });
      beep('error');
      return;
    }

    const newQty = scanMode === 'OUT' ? part.currentQty - qty : part.currentQty + qty;
    beep(newQty <= part.minQty && newQty > 0 ? 'warning' : 'success');
    showScanResult(container, { success: true, part, qty, newQty, direction: scanMode });
    addToHistory({ success: true, part, qty, direction: scanMode, timestamp: new Date() }, container);

    const card = container.querySelector('#scan-card');
    if (card) {
      card.style.animation = 'scanFlash 0.35s ease';
      setTimeout(() => { card.style.animation = ''; }, 350);
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
    const { part, qty, newQty, direction, isAudit } = result;

    if (isAudit) {
      el.style.cssText = `
        border-radius:var(--radius-xl);
        padding:var(--space-5);
        margin-bottom:var(--space-5);
        background:var(--color-paper-1);
        border:1px solid var(--color-accent);
        animation:slideUp 0.2s ease;
      `;
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:var(--space-4)">
          <span class="icon" style="font-size:36px;color:var(--color-accent)">manage_search</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:var(--text-lg)">${escHtml(part.description)}</div>
            <div style="font-family:var(--font-mono);font-size:var(--text-xs);color:var(--color-ink-muted)">${escHtml(part.qrId)} · ${escHtml(part.category)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">Stok Tersedia</div>
            <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-accent)">${part.currentQty} <span style="font-size:var(--text-xs)">${escHtml(part.unit)}</span></div>
          </div>
        </div>
      `;
      return;
    }

    const isOut = direction === 'OUT';
    const color = isOut ? 'var(--color-status-out)' : 'var(--color-status-ok)';
    const bgColor = isOut ? 'var(--color-status-out-dim)' : 'var(--color-status-ok-dim)';

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
          <div style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-ink-muted)">${escHtml(part.qrId)} · ${escHtml(part.serialNumber)}</div>
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
      background:var(--color-status-out-dim);
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
  } catch (_) {}
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

    if (entry.isAudit) {
      return `
        <div style="
          background:var(--color-paper-1);border:1px solid var(--color-paper-border);
          border-radius:var(--radius-md);padding:var(--space-3);
          display:flex;align-items:center;gap:var(--space-2);
        ">
          <span class="icon icon--sm" style="color:var(--color-accent)">manage_search</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--text-sm);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${escHtml(entry.part?.description || '—')}
            </div>
            <div style="font-size:var(--text-xs);color:var(--color-ink-muted)">${formatTime(entry.timestamp)} · Cek Data</div>
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
