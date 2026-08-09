/**
 * ipc-handlers.js — Registry semua IPC handlers untuk SAP StockMon
 * Setiap handler wajib: try-catch + return { success, data|error }
 */

const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const partsRepo = require('./db/parts.repository');
const settingsRepo = require('./db/settings.repository');
const csvService = require('./csv.service');
const qrGenerator = require('./qr.generator');
const sequenceManager = require('./db/sequence.manager');

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

  ipcMain.handle('import:csv', async (event, filePath) => {
    try {
      // Jika tidak ada filePath, tampilkan file dialog
      if (!filePath) {
        const win = require('electron').BrowserWindow.fromWebContents(event.sender);
        const result = await dialog.showOpenDialog(win, {
          title: 'Pilih File CSV',
          properties: ['openFile'],
          filters: [{ name: 'CSV Files', extensions: ['csv', 'txt'] }],
        });
        if (result.canceled || !result.filePaths.length) {
          return { success: false, error: { code: 'CANCELED', message: 'Import dibatalkan' } };
        }
        filePath = result.filePaths[0];
      }

      // Parse & validate
      const { rows, errors, totalRows } = csvService.parseCSV(filePath);

      // Kirim preview ke renderer (jangan insert dulu)
      return {
        success: true,
        data: {
          filePath,
          totalRows,
          validRows: rows.length,
          errorRows: errors.length,
          errors,         // Array error per baris (max 50 untuk preview)
          previewRows: rows.slice(0, 5), // Preview 5 baris pertama
          rows,           // Semua valid rows — untuk di-insert oleh import:confirm
        },
      };
    } catch (err) {
      logger.error('IPC import:csv error', { error: err.message });
      return { success: false, error: { code: 'PARSE_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('import:confirm', async (event, rows) => {
    try {
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return { success: false, error: { code: 'NO_DATA', message: 'Tidak ada data untuk diimport' } };
      }

      const win = require('electron').BrowserWindow.fromWebContents(event.sender);
      let lastProgress = 0;

      const result = csvService.batchInsert(rows, (current, total) => {
        const pct = Math.round((current / total) * 100);
        if (pct !== lastProgress) {
          lastProgress = pct;
          win.webContents.send('import-progress', { current, total, percent: pct });
        }
      });

      logger.info('CSV import completed', result);
      return { success: true, data: result };
    } catch (err) {
      logger.error('IPC import:confirm error', { error: err.message });
      return { success: false, error: { code: 'IMPORT_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('import:downloadTemplate', async (event) => {
    try {
      const win = require('electron').BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(win, {
        title: 'Simpan Template CSV',
        defaultPath: 'template_import_barang.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: { code: 'CANCELED', message: 'Dibatalkan' } };
      }

      const content = csvService.generateTemplate();
      fs.writeFileSync(result.filePath, content, 'utf-8');
      shell.showItemInFolder(result.filePath);

      return { success: true, data: { filePath: result.filePath } };
    } catch (err) {
      logger.error('IPC import:downloadTemplate error', { error: err.message });
      return { success: false, error: { code: 'IO_ERROR', message: err.message } };
    }
  });

  // ── QR Code ────────────────────────────────────────────────────────────────

  ipcMain.handle('qr:generateForPart', async (_, partId) => {
    try {
      const partRes = partsRepo.getPartById(partId);
      if (!partRes.success) return partRes;
      const part = partRes.data;

      const { dataUrl, svg, payload, hash } = await qrGenerator.generateForPart(part);

      // Simpan hash ke DB (untuk deteksi stale)
      partsRepo.updatePart(partId, {
        qrGeneratedAt: new Date().toISOString(),
        qrPayloadHash: hash,
      });

      return { success: true, data: { dataUrl, svg, payload, hash, qrId: part.qrId } };
    } catch (err) {
      logger.error('IPC qr:generateForPart error', { error: err.message });
      return { success: false, error: { code: 'QR_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('qr:getDataUrl', async (_, payload, size) => {
    try {
      const dataUrl = await qrGenerator.generateDataUrl(payload, { size: size || 256 });
      return { success: true, data: { dataUrl } };
    } catch (err) {
      logger.error('IPC qr:getDataUrl error', { error: err.message });
      return { success: false, error: { code: 'QR_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('qr:peekNext', async () => {
    try {
      const nextId = sequenceManager.peekNextQrId();
      return { success: true, data: { nextId } };
    } catch (err) {
      return { success: false, error: { code: 'SEQ_ERROR', message: err.message } };
    }
  });

  logger.info('All IPC handlers registered');
}

module.exports = { registerIpcHandlers };
