/**
 * state.js — App State Management (Pub/Sub Pattern)
 * Tidak menggunakan framework — pure vanilla JS pub/sub.
 */

class AppState {
  constructor() {
    /** @type {Record<string, any>} */
    this._state = {
      parts: [],
      transactions: [],
      kpis: {
        totalSku: 0,
        totalItems: 0,
        outCount: 0,
        lowCount: 0,
        reviewCount: 0,
        inToday: 0,
        outToday: 0,
      },
      filters: {
        search: '',
        category: null,
        status: null,
        sortBy: 'created_at',
        sortDir: 'DESC',
      },
      settings: {},
      currentView: 'dashboard',
      sidebarCollapsed: false,
      isLoading: false,
    };

    /** @type {Record<string, Function[]>} */
    this._listeners = {};
  }

  /**
   * Ambil state saat ini untuk satu key
   * @param {string} key
   * @returns {any}
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Subscribe ke perubahan state
   * @param {string} key
   * @param {Function} fn - dipanggil dengan (newValue, prevValue)
   * @returns {Function} unsubscribe function
   */
  subscribe(key, fn) {
    if (!this._listeners[key]) {
      this._listeners[key] = [];
    }
    this._listeners[key].push(fn);

    // Return unsubscribe
    return () => {
      this._listeners[key] = this._listeners[key].filter((l) => l !== fn);
    };
  }

  /**
   * Update state dan notify listeners
   * @param {string} key
   * @param {any | Function} updater - nilai baru atau fungsi (prev) => next
   */
  update(key, updater) {
    const prev = this._state[key];
    const next = typeof updater === 'function' ? updater(prev) : updater;

    if (prev === next) return; // No-op jika tidak berubah

    this._state[key] = next;
    this._emit(key, next, prev);
  }

  /**
   * Update state tanpa trigger listeners (silent)
   */
  setSilent(key, value) {
    this._state[key] = value;
  }

  /**
   * Emit event ke semua subscribers
   */
  _emit(key, newValue, prevValue) {
    const listeners = this._listeners[key] || [];
    for (const fn of listeners) {
      try {
        fn(newValue, prevValue);
      } catch (err) {
        console.error(`[State] Error in listener for "${key}":`, err);
      }
    }
  }

  /**
   * Subscribe ke semua perubahan state (debug)
   */
  subscribeAll(fn) {
    const keys = Object.keys(this._state);
    const unsubs = keys.map((key) => this.subscribe(key, (val) => fn(key, val)));
    return () => unsubs.forEach((u) => u());
  }
}

export const state = new AppState();
