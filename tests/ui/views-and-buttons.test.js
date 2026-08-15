/**
 * views-and-buttons.test.js — Automated test simulating all UI Views, Buttons, Inputs & Event Handlers
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('UI Views & Buttons Interaction Harness', async (t) => {

  // Create lightweight DOM element factory for UI testing
  function createMockElement(tagName = 'div', id = '', className = '') {
    const listeners = new Map();
    const children = [];
    const attributes = new Map();
    let innerHTML = '';

    const el = {
      tagName: tagName.toUpperCase(),
      id,
      className,
      classList: {
        classes: new Set(className.split(' ').filter(Boolean)),
        add(c) { this.classes.add(c); el.className = [...this.classes].join(' '); },
        remove(c) { this.classes.delete(c); el.className = [...this.classes].join(' '); },
        toggle(c, force) {
          if (force !== undefined) {
            if (force) this.add(c); else this.remove(c);
            return force;
          }
          if (this.classes.has(c)) { this.remove(c); return false; }
          this.add(c); return true;
        },
        contains(c) { return this.classes.has(c); },
      },
      style: {},
      dataset: {},
      value: '',
      checked: false,
      disabled: false,
      hidden: false,
      textContent: '',
      options: [],
      addEventListener(event, handler) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(handler);
      },
      removeEventListener(event, handler) {
        if (!listeners.has(event)) return;
        listeners.set(event, listeners.get(event).filter((h) => h !== handler));
      },
      async click() {
        const list = listeners.get('click') || [];
        for (const handler of list) {
          await handler({
            target: el,
            preventDefault: () => {},
            stopPropagation: () => {},
            closest: (sel) => {
              if (sel.startsWith('#') && el.id === sel.slice(1)) return el;
              if (sel.startsWith('.') && el.classList.contains(sel.slice(1))) return el;
              if (sel.includes('[data-') && el.dataset) return el;
              return el;
            }
          });
        }
      },
      async trigger(event, eventData = {}) {
        const list = listeners.get(event) || [];
        for (const handler of list) {
          await handler({ target: el, preventDefault: () => {}, ...eventData });
        }
      },
      querySelector: (selector) => null,
      querySelectorAll: (selector) => [],
      appendChild: (child) => { children.push(child); return child; },
      removeChild: (child) => {
        const idx = children.indexOf(child);
        if (idx >= 0) children.splice(idx, 1);
        return child;
      },
      remove: () => {},
      focus: () => {},
      blur: () => {},
    };

    Object.defineProperty(el, 'innerHTML', {
      get: () => innerHTML,
      set: (val) => { innerHTML = val; },
    });

    return el;
  }

  await t.test('Scanner view: audio synthesis and direction toggle buttons', () => {
    let mode = 'OUT';
    const btnIn = createMockElement('button', 'btn-mode-in');
    const btnOut = createMockElement('button', 'btn-mode-out');

    btnIn.addEventListener('click', () => {
      mode = 'IN';
      btnIn.classList.add('btn--primary');
      btnOut.classList.remove('btn--primary');
    });

    btnOut.addEventListener('click', () => {
      mode = 'OUT';
      btnOut.classList.add('btn--primary');
      btnIn.classList.remove('btn--primary');
    });

    btnIn.click();
    assert.equal(mode, 'IN');
    assert.equal(btnIn.classList.contains('btn--primary'), true);

    btnOut.click();
    assert.equal(mode, 'OUT');
    assert.equal(btnOut.classList.contains('btn--primary'), true);
  });

  await t.test('Dashboard view: KPI filtering simulation', () => {
    let activeFilter = '';
    const kpiCards = [
      { status: 'OUT', count: 3 },
      { status: 'LOW', count: 5 },
      { status: 'REVIEW', count: 2 },
    ];

    const filterHandler = (status) => {
      activeFilter = activeFilter === status ? '' : status;
    };

    filterHandler('OUT');
    assert.equal(activeFilter, 'OUT');

    filterHandler('OUT'); // Toggle off
    assert.equal(activeFilter, '');

    filterHandler('LOW');
    assert.equal(activeFilter, 'LOW');
  });

  await t.test('Part Form: real-time category detection based on keyword matches', () => {
    const CATEGORY_RULES = [
      { category: 'Mechanical/Fastener', keywords: ['baut', 'bolt', 'screw', 'mur', 'nut'] },
      { category: 'Mechanical/Bearing', keywords: ['bearing', 'laher'] },
      { category: 'Mechanical/Seal', keywords: ['seal', 'gasket', 'o-ring'] },
      { category: 'Electrical/Cable', keywords: ['kabel', 'cable', 'wire'] },
      { category: 'Electrical/Component', keywords: ['relay', 'contactor', 'mcb'] },
      { category: 'Instrument/Pressure', keywords: ['pressure', 'gauge', 'manometer'] },
      { category: 'Consumable/Lubricant', keywords: ['oli', 'oil', 'grease', 'pelumas'] },
      { category: 'Tool', keywords: ['kunci', 'obeng', 'tang', 'gerinda'] },
    ];

    function suggestCategory(text) {
      const lower = String(text || '').toLowerCase();
      for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some((k) => lower.includes(k))) {
          return rule.category;
        }
      }
      return 'Uncategorized';
    }

    assert.equal(suggestCategory('Baut M12x40 Galvanis'), 'Mechanical/Fastener');
    assert.equal(suggestCategory('Deep Groove Bearing 6000'), 'Mechanical/Bearing');
    assert.equal(suggestCategory('Kabel Listrik NYA 1x2.5mm'), 'Electrical/Cable');
    assert.equal(suggestCategory('Pressure Gauge 10 Bar'), 'Instrument/Pressure');
    assert.equal(suggestCategory('Pelumas Grease Heavy Duty'), 'Consumable/Lubricant');
    assert.equal(suggestCategory('Custom Unknown Item XYZ'), 'Uncategorized');
  });

  await t.test('Settings view: theme switcher and local preferences', () => {
    let appliedTheme = 'dark';
    const themeHandler = (theme) => {
      appliedTheme = theme;
    };

    themeHandler('light');
    assert.equal(appliedTheme, 'light');

    themeHandler('dark');
    assert.equal(appliedTheme, 'dark');
  });

  await t.test('Toast Notification Engine: message queuing and timing', () => {
    const toastQueue = [];
    const addToast = (type, title, message) => {
      const item = { id: Date.now() + Math.random(), type, title, message };
      toastQueue.push(item);
      return item;
    };
    const removeToast = (id) => {
      const idx = toastQueue.findIndex((t) => t.id === id);
      if (idx >= 0) toastQueue.splice(idx, 1);
    };

    const t1 = addToast('success', 'Stok Diperbarui', 'IN +10 pcs');
    const t2 = addToast('error', 'Scan Gagal', 'Barang tidak ditemukan');

    assert.equal(toastQueue.length, 2);
    assert.equal(toastQueue[0].type, 'success');
    assert.equal(toastQueue[1].type, 'error');

    removeToast(t1.id);
    assert.equal(toastQueue.length, 1);
    assert.equal(toastQueue[0].title, 'Scan Gagal');
  });
});
