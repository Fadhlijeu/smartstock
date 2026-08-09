/**
 * index.js — Entry point SAP StockMon Electron App
 */

'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('path');

// ─── UNCAUGHT EXCEPTION HANDLER ─────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  // Logger mungkin belum init — log ke console sebagai fallback
  try {
    const { getLogger } = require('./logger');
    getLogger().error('Uncaught Exception', { error: err.message, stack: err.stack });
  } catch {}
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  try {
    const { getLogger } = require('./logger');
    getLogger().error('Unhandled Rejection', { reason: String(reason) });
  } catch {}
});

// ─── SINGLE INSTANCE LOCK ───────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

let mainWindow = null;

app.whenReady().then(async () => {
  // 1. Init logger (setelah app ready, app.getPath tersedia)
  const { initLogger } = require('./logger');
  const logger = initLogger();
  logger.info('SAP StockMon starting up', {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
  });

  // 2. Init database
  try {
    const { initDatabase } = require('./db/db');
    initDatabase(logger);
    logger.info('Database ready');
  } catch (err) {
    logger.error('Database initialization failed — cannot continue', { error: err.message });
    // Show error dialog dan quit
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Database Error',
      `Gagal membuka database:\n${err.message}\n\nApp akan ditutup.`
    );
    app.quit();
    return;
  }

  // 3. Register IPC handlers
  const { registerIpcHandlers } = require('./ipc-handlers');
  registerIpcHandlers(logger);

  // 4. Buat main window
  const { createMainWindow } = require('./window');
  const preloadPath = path.join(__dirname, 'preload.js');
  mainWindow = createMainWindow(preloadPath);

  // 5. Build menu
  const { buildMenu } = require('./menu');
  buildMenu(mainWindow);

  // 6. Load renderer
  const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
  mainWindow.loadFile(rendererPath);

  logger.info('Main window loaded');

  // Dev tools di mode dev
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

// ─── SECOND INSTANCE ────────────────────────────────────────────────────────
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ─── WINDOW ALL CLOSED ──────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  // Quit di semua platform (termasuk macOS untuk simplisitas)
  const { getLogger } = require('./logger');
  const logger = getLogger();

  try {
    const { closeDatabase } = require('./db/db');
    closeDatabase(logger);
  } catch {}

  logger.info('SAP StockMon shutting down');
  app.quit();
});

// ─── ACTIVATE (macOS) ───────────────────────────────────────────────────────
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // Re-create window — tidak perlu di Windows tapi good practice
  }
});
