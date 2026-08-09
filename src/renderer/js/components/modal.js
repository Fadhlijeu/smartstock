/**
 * modal.js — Modal Dialog System untuk SAP StockMon
 * Singleton modal dengan animation, keyboard trap, dan backdrop click dismiss.
 */

let backdrop = null;
let onCloseCallback = null;

function getBackdrop() {
  if (!backdrop) {
    backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      document.body.appendChild(backdrop);
    }
  }
  return backdrop;
}

/**
 * Buka modal dengan content yang diberikan
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.body - HTML string
 * @param {string} [options.size] - '' | 'wide' | 'narrow'
 * @param {Array<{label, type, id, onClick}>} [options.actions] - footer buttons
 * @param {Function} [options.onClose]
 * @returns {{ close: Function, getEl: Function }}
 */
export function openModal({ title, body, size = '', actions = [], onClose }) {
  const bd = getBackdrop();
  onCloseCallback = onClose || null;

  const sizeClass = size ? `modal--${size}` : '';
  const actionsHtml = actions.map(({ label, type = 'secondary', id }) =>
    `<button class="btn btn--${type}" id="${id || ''}">${label}</button>`
  ).join('');

  bd.innerHTML = `
    <div class="modal ${sizeClass}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal__header">
        <h2 class="modal__title" id="modal-title">${escapeHtml(title)}</h2>
        <button class="modal__close btn btn--icon btn--ghost" id="modal-close-btn" aria-label="Tutup">
          <span class="icon">close</span>
        </button>
      </div>
      <div class="modal__body">
        ${body}
      </div>
      ${actions.length > 0 ? `<div class="modal__footer">${actionsHtml}</div>` : ''}
    </div>
  `;

  // Show backdrop
  bd.style.display = 'flex';
  requestAnimationFrame(() => bd.classList.add('visible'));

  // Bind close button
  const closeBtn = bd.querySelector('#modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Bind action buttons
  for (const action of actions) {
    if (!action.onClick || !action.id) continue;
    const btn = bd.querySelector(`#${action.id}`);
    if (btn) btn.addEventListener('click', action.onClick);
  }

  // Backdrop click to close
  bd.addEventListener('click', handleBackdropClick);

  // Keyboard: Escape to close
  document.addEventListener('keydown', handleKeyDown);

  // Focus first focusable element
  setTimeout(() => {
    const firstFocusable = bd.querySelector('button, input, select, textarea, [tabindex]');
    if (firstFocusable && firstFocusable.id !== 'modal-close-btn') {
      firstFocusable.focus();
    } else if (closeBtn) {
      closeBtn.focus();
    }
  }, 50);

  return {
    close: closeModal,
    getEl: () => bd.querySelector('.modal'),
  };
}

/**
 * Tutup modal yang sedang aktif
 */
export function closeModal() {
  const bd = getBackdrop();
  bd.classList.remove('visible');
  bd.removeEventListener('click', handleBackdropClick);
  document.removeEventListener('keydown', handleKeyDown);

  setTimeout(() => {
    bd.style.display = 'none';
    bd.innerHTML = '';
  }, 150);

  if (typeof onCloseCallback === 'function') {
    onCloseCallback();
    onCloseCallback = null;
  }
}

/**
 * Konfirmasi dialog sederhana
 * @param {string} title
 * @param {string} message
 * @param {Object} [options]
 * @returns {Promise<boolean>}
 */
export function confirmDialog(title, message, options = {}) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `<p style="color:var(--color-ink-secondary);font-size:var(--text-md);line-height:1.6">${escapeHtml(message)}</p>`,
      size: 'narrow',
      actions: [
        {
          label: options.cancelLabel || 'Batal',
          type: 'ghost',
          id: 'modal-cancel',
          onClick: () => { closeModal(); resolve(false); },
        },
        {
          label: options.confirmLabel || 'Konfirmasi',
          type: options.danger ? 'danger' : 'primary',
          id: 'modal-confirm',
          onClick: () => { closeModal(); resolve(true); },
        },
      ],
      onClose: () => resolve(false),
    });
  });
}

function handleBackdropClick(e) {
  if (e.target === backdrop) {
    closeModal();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
