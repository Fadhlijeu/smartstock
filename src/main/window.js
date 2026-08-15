/**
 * window.js — BrowserWindow configuration untuk SAP StockMon
 */

const { BrowserWindow } = require('electron');
const path = require('path');

/**
 * Buat dan konfigurasi BrowserWindow utama
 * @param {string} preloadPath — path absolut ke preload.js
 * @returns {BrowserWindow}
 */
function createMainWindow(preloadPath) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SAP StockMon',
    backgroundColor: '#0f1117', // Sama dengan --color-paper-base agar tidak flash putih
    center: true,               // Selalu muncul di tengah layar
    show: false,                // Show setelah ready-to-show event
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,       // WAJIB untuk keamanan
      nodeIntegration: false,       // DILARANG — akses Node via preload saja
      sandbox: false,               // Perlu false untuk preload dengan require
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Show window setelah render selesai (no white flash)
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Fallback: paksa show setelah 5 detik kalau ready-to-show tidak trigger
  const showFallback = setTimeout(() => {
    if (!win.isVisible()) {
      win.show();
      win.focus();
    }
  }, 5000);

  win.once('show', () => clearTimeout(showFallback));

  return win;
}

module.exports = { createMainWindow };
