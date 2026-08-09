/**
 * ipc-handlers.js — Registry semua IPC handlers untuk SAP StockMon
 * Setiap handler wajib: try-catch + return { success, data|error }
 */

const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const partsRepo = require('./db/parts.repository');
const settingsRepo = require('./db/settings.repository');

/**
 * Register semua IPC handlers
 * @param {import('./logger').Logger} logger
 */
function registerIpcHandlers(logger) {

  // ── Parts ──────────────────────────────────────────────────────────────────

  ipcMain.handle('parts:getAll', async (_, filters) => {
    try {
      return partsRepo.getParts(filters);
    } catch (err) {
      logger.error('IPC parts:getAll error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('parts:getById', async (_, id) => {
    try {
      return partsRepo.getPartById(id);
    } catch (err) {
      logger.error('IPC parts:getById error', { id, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('parts:create', async (_, data) => {
    try {
      return partsRepo.createPart(data);
    } catch (err) {
      logger.error('IPC parts:create error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('parts:update', async (_, id, data) => {
    try {
      return partsRepo.updatePart(id, data);
    } catch (err) {
      logger.error('IPC parts:update error', { id, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('parts:delete', async (_, id) => {
    try {
      return partsRepo.deletePart(id);
    } catch (err) {
      logger.error('IPC parts:delete error', { id, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('parts:kpiStats', async () => {
    try {
      return partsRepo.getKpiStats();
    } catch (err) {
      logger.error('IPC parts:kpiStats error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  ipcMain.handle('settings:getAll', async () => {
    try {
      return settingsRepo.getAllSettings();
    } catch (err) {
      logger.error('IPC settings:getAll error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('settings:get', async (_, key) => {
    try {
      return settingsRepo.getSetting(key);
    } catch (err) {
      logger.error('IPC settings:get error', { key, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('settings:update', async (_, updates) => {
    try {
      return settingsRepo.updateSettings(updates);
    } catch (err) {
      logger.error('IPC settings:update error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  // ── Dialog ─────────────────────────────────────────────────────────────────

  ipcMain.handle('dialog:openFile', async (event, options) => {
    try {
      const win = require('electron').BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(win, options || {
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      return { success: true, data: result };
    } catch (err) {
      logger.error('IPC dialog:openFile error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  // ── App ────────────────────────────────────────────────────────────────────

  ipcMain.handle('app:getVersion', async () => {
    return { success: true, data: app.getVersion() };
  });

  ipcMain.handle('app:openDataDir', async () => {
    try {
      const dataDir = path.join(app.getPath('userData'), 'data');
      shell.openPath(dataDir);
      return { success: true };
    } catch (err) {
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  // ── Placeholders untuk modul yang akan diimplementasi di M1-M3 ─────────────

  ipcMain.handle('qr:generate', async (_, partId) => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'QR generation akan diimplementasi di M2' } };
  });

  ipcMain.handle('qr:generateBatch', async (_, partIds) => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'QR batch generation akan diimplementasi di M2' } };
  });

  ipcMain.handle('transactions:getAll', async (_, filters) => {
    return { success: true, data: [] }; // M3
  });

  ipcMain.handle('transactions:create', async (_, data) => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Transactions akan diimplementasi di M3' } };
  });

  ipcMain.handle('transactions:undoLast', async () => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Undo akan diimplementasi di M3' } };
  });

  ipcMain.handle('export:excel', async (_, type, filters) => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Excel export akan diimplementasi di M5' } };
  });

  ipcMain.handle('export:pdf', async (_, type, filters) => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'PDF export akan diimplementasi di M5' } };
  });

  ipcMain.handle('import:csv', async (_, filePath) => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'CSV import akan diimplementasi di M1' } };
  });

  ipcMain.handle('import:downloadTemplate', async () => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'CSV template akan diimplementasi di M1' } };
  });

  logger.info('All IPC handlers registered');
}

module.exports = { registerIpcHandlers };
