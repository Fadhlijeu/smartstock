/**
 * toast.js — Toast Notification System untuk SAP StockMon
 * Auto-dismiss, stack max 3, slide-up animation.
 */

const MAX_TOASTS = 3;
const TOAST_DURATION = 3000;  // ms
const ERROR_DURATION = 6000;  // ms untuk error — perlu dismiss manual

let container = null;

function getContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  }
  return container;
}

/**
 * Tampilkan toast notification
 * @param {Object} options
 * @param {'success'|'error'|'warning'|'info'} options.type
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {number} [options.duration] - 0 = tidak auto dismiss
 */
export function showToast({ type = 'info', title, message, duration }) {
  const c = getContainer();

  // Limit max toasts — hapus yang terlama jika lebih dari MAX
  const toasts = c.querySelectorAll('.toast');
  if (toasts.length >= MAX_TOASTS) {
    dismissToast(toasts[0]);
  }

  // Resolve duration
  const autoDismiss = duration !== undefined ? duration
    : type === 'error' ? ERROR_DURATION : TOAST_DURATION;

  // Icon map
  const iconMap = {
    success: 'check_circle',
    error: 'cancel',
    warning: 'warning',
    info: 'info',
  };

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');

  el.innerHTML = `
    <span class="icon toast__icon">${iconMap[type]}</span>
    <div class="toast__content">
      <div class="toast__title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast__message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast__close" aria-label="Tutup notifikasi">
      <span class="icon icon--sm">close</span>
    </button>
  `;

  el.querySelector('.toast__close').addEventListener('click', () => dismissToast(el));

  c.appendChild(el);

  // Auto-dismiss
  let timer = null;
  if (autoDismiss > 0) {
    timer = setTimeout(() => dismissToast(el), autoDismiss);
  }

  // Pause on hover
  el.addEventListener('mouseenter', () => {
    if (timer) clearTimeout(timer);
  });
  el.addEventListener('mouseleave', () => {
    if (autoDismiss > 0) {
      timer = setTimeout(() => dismissToast(el), 1500);
    }
  });

  return el;
}

function dismissToast(el) {
  if (!el || !el.parentNode) return;
  el.classList.add('removing');
  el.addEventListener('animationend', () => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, { once: true });
}

// Shorthand helpers
export const toast = {
  success: (title, message, duration) => showToast({ type: 'success', title, message, duration }),
  error: (title, message, duration) => showToast({ type: 'error', title, message, duration }),
  warning: (title, message, duration) => showToast({ type: 'warning', title, message, duration }),
  info: (title, message, duration) => showToast({ type: 'info', title, message, duration }),
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
