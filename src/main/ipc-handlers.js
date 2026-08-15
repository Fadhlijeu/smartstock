/**
 * ipc-handlers.js — Registry semua IPC handlers untuk SAP StockMon
 * Setiap handler wajib: try-catch + return { success, data|error }
 */

let electronModule = {};
try {
  electronModule = require('electron');
} catch {}

const path = require('path');
const fs = require('fs');
const partsRepo = require('./db/parts.repository');
const settingsRepo = require('./db/settings.repository');
const transactionsRepo = require('./db/transactions.repository');
const csvService = require('./csv.service');
const exportService = require('./export.service');
const qrGenerator = require('./qr.generator');
const sequenceManager = require('./db/sequence.manager');

/**
 * Register semua IPC handlers
 * @param {import('./logger').Logger} logger
 * @param {Object} [customIpcMain]
 */
function registerIpcHandlers(logger, customIpcMain = null) {
  const ipc = customIpcMain || (electronModule && typeof electronModule === 'object' ? electronModule.ipcMain : null);
  if (!ipc || !ipc.handle) {
    if (logger?.warn) logger.warn('ipcMain not available');
    return;
  }

  const dialog = electronModule.dialog || {};
  const shell = electronModule.shell || {};
  const app = electronModule.app || { getVersion: () => '0.1.0', getPath: () => '' };

  function getBrowserWin(event) {
    try {
      if (electronModule && electronModule.BrowserWindow && event && event.sender) {
        return electronModule.BrowserWindow.fromWebContents(event.sender) || null;
      }
    } catch (_) {}
    return null;
  }

  // ── Parts ──────────────────────────────────────────────────────────────────

  ipc.handle('parts:getAll', async (_, filters) => {
    try {
      return partsRepo.getParts(filters);
    } catch (err) {
      logger.error('IPC parts:getAll error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:getById', async (_, id) => {
    try {
      return partsRepo.getPartById(id);
    } catch (err) {
      logger.error('IPC parts:getById error', { id, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:getByQrId', async (_, qrId) => {
    try {
      return partsRepo.getPartByQrId(qrId);
    } catch (err) {
      logger.error('IPC parts:getByQrId error', { qrId, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:getBySerialNumber', async (_, serialNumber) => {
    try {
      return partsRepo.getPartBySerialNumber(serialNumber);
    } catch (err) {
      logger.error('IPC parts:getBySerialNumber error', { serialNumber, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:create', async (_, data) => {
    try {
      return partsRepo.createPart(data);
    } catch (err) {
      logger.error('IPC parts:create error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:update', async (_, id, data) => {
    try {
      return partsRepo.updatePart(id, data);
    } catch (err) {
      logger.error('IPC parts:update error', { id, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:delete', async (_, id) => {
    try {
      return partsRepo.deletePart(id);
    } catch (err) {
      logger.error('IPC parts:delete error', { id, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:deleteBatch', async (_, ids) => {
    try {
      return partsRepo.deletePartsBatch(ids);
    } catch (err) {
      logger.error('IPC parts:deleteBatch error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('parts:kpiStats', async () => {
    try {
      return partsRepo.getKpiStats();
    } catch (err) {
      logger.error('IPC parts:kpiStats error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  ipc.handle('settings:getAll', async () => {
    try {
      return settingsRepo.getAllSettings();
    } catch (err) {
      logger.error('IPC settings:getAll error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('settings:get', async (_, key) => {
    try {
      return settingsRepo.getSetting(key);
    } catch (err) {
      logger.error('IPC settings:get error', { key, error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('settings:update', async (_, updates) => {
    try {
      return settingsRepo.updateSettings(updates);
    } catch (err) {
      logger.error('IPC settings:update error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  // ── Dialog ─────────────────────────────────────────────────────────────────

  ipc.handle('dialog:openFile', async (event, options) => {
    try {
      const win = getBrowserWin(event);
      const opts = options || {
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      };
      const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
      return { success: true, data: result };
    } catch (err) {
      logger.error('IPC dialog:openFile error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  // ── App ────────────────────────────────────────────────────────────────────

  ipc.handle('app:getVersion', async () => {
    return { success: true, data: app.getVersion() };
  });

  ipc.handle('app:openDataDir', async () => {
    try {
      const dataDir = path.join(app.getPath('userData'), 'data');
      shell.openPath(dataDir);
      return { success: true };
    } catch (err) {
      return { success: false, error: { code: 'FS_ERROR', message: err.message } };
    }
  });

  ipc.handle('data:seedDemo', async () => {
    try {
      const result = partsRepo.seedDemoData();
      return result;
    } catch (err) {
      logger.error('IPC data:seedDemo error', { error: err.message });
      return { success: false, error: { code: 'SEED_ERROR', message: err.message } };
    }
  });

  ipc.handle('qr:generate', async (_, partId) => {
    try {
      const partRes = partsRepo.getPartById(partId);
      if (!partRes.success) return partRes;
      const part = partRes.data;
      const qrData = await qrGenerator.generateForPart(part);
      partsRepo.updatePart(partId, {
        qrGeneratedAt: new Date().toISOString(),
        qrPayloadHash: qrData.hash,
      });
      return { success: true, data: { dataUrl: qrData.dataUrl, svg: qrData.svg, payload: qrData.payload, hash: qrData.hash, qrId: part.qrId } };
    } catch (err) {
      logger.error('IPC qr:generate error', { partId, error: err.message });
      return { success: false, error: { code: 'QR_ERROR', message: err.message } };
    }
  });

  ipc.handle('qr:generateBatch', async (_, partIds) => {
    try {
      const results = [];
      for (const id of partIds) {
        const partRes = partsRepo.getPartById(id);
        if (partRes.success) {
          const qr = await qrGenerator.generateForPart(partRes.data);
          results.push({ part: partRes.data, ...qr });
        }
      }
      return { success: true, data: results };
    } catch (err) {
      logger.error('IPC qr:generateBatch error', { error: err.message });
      return { success: false, error: { code: 'QR_BATCH_ERROR', message: err.message } };
    }
  });

  ipc.handle('transactions:getAll', async (_, filters) => {
    try {
      return transactionsRepo.getTransactions(filters);
    } catch (err) {
      logger.error('IPC transactions:getAll error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('transactions:create', async (event, data) => {
    try {
      const result = transactionsRepo.createTransaction(data);
      if (result.success) {
        const win = getBrowserWin(event);
        if (win && win.webContents) {
          win.webContents.send('stock-updated', result.data);
        }
      }
      return result;
    } catch (err) {
      logger.error('IPC transactions:create error', { error: err.message });
      return { success: false, error: { code: 'TX_ERROR', message: err.message } };
    }
  });

  ipc.handle('transactions:undoLast', async () => {
    try {
      return transactionsRepo.undoLastTransaction();
    } catch (err) {
      logger.error('IPC transactions:undoLast error', { error: err.message });
      return { success: false, error: { code: 'IPC_ERROR', message: err.message } };
    }
  });

  ipc.handle('export:excel', async (event, type, filters) => {
    try {
      const win = getBrowserWin(event);
      const reportNames = {
        stock: 'StockSnapshot',
        transactions: 'TransactionLog',
        lowStock: 'LowStockAlert',
      };
      const reportName = reportNames[type] || 'StockReport';
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const saveOptions = {
        title: 'Simpan Laporan Excel',
        defaultPath: `${reportName}_${stamp}.xlsx`,
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
      };
      const result = win ? await dialog.showSaveDialog(win, saveOptions) : await dialog.showSaveDialog(saveOptions);

      if (result.canceled || !result.filePath) {
        return { success: false, error: { code: 'CANCELED', message: 'Export dibatalkan' } };
      }

      if (type === 'transactions') {
        const exported = await exportService.exportTransactionLog(result.filePath, filters);
        if (exported.success && shell && shell.showItemInFolder) shell.showItemInFolder(result.filePath);
        return exported;
      }

      if (type === 'lowStock') {
        const exported = await exportService.exportLowStock(result.filePath);
        if (exported.success && shell && shell.showItemInFolder) shell.showItemInFolder(result.filePath);
        return exported;
      }

      const exported = await exportService.exportStockSnapshot(result.filePath, filters);
      if (exported.success && shell && shell.showItemInFolder) shell.showItemInFolder(result.filePath);
      return exported;
    } catch (err) {
      logger.error('IPC export:excel error', { error: err.message });
      return { success: false, error: { code: 'EXPORT_ERROR', message: err.message } };
    }
  });

  ipc.handle('export:pdf', async (_, type, filters) => {
    return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'PDF export akan diimplementasi di M5' } };
  });

  ipc.handle('import:csv', async (event, filePath) => {
    try {
      // Jika tidak ada filePath, tampilkan file dialog
      if (!filePath) {
        const win = getBrowserWin(event);
        const openOptions = {
          title: 'Pilih File CSV',
          properties: ['openFile'],
          filters: [{ name: 'CSV Files', extensions: ['csv', 'txt'] }],
        };
        const result = win ? await dialog.showOpenDialog(win, openOptions) : await dialog.showOpenDialog(openOptions);
        if (result.canceled || !result.filePaths || !result.filePaths.length) {
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

  ipc.handle('import:confirm', async (event, rows) => {
    try {
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return { success: false, error: { code: 'NO_DATA', message: 'Tidak ada data untuk diimport' } };
      }

      const win = getBrowserWin(event);
      let lastProgress = 0;

      const result = csvService.batchInsert(rows, (current, total) => {
        const pct = Math.round((current / total) * 100);
        if (pct !== lastProgress) {
          lastProgress = pct;
          if (win && win.webContents) {
            win.webContents.send('import-progress', { current, total, percent: pct });
          }
        }
      });

      logger.info('CSV import completed', result);
      return { success: true, data: result };
    } catch (err) {
      logger.error('IPC import:confirm error', { error: err.message });
      return { success: false, error: { code: 'IMPORT_ERROR', message: err.message } };
    }
  });

  ipc.handle('import:downloadTemplate', async (event) => {
    try {
      const win = getBrowserWin(event);
      const saveOptions = {
        title: 'Simpan Template CSV',
        defaultPath: 'template_import_barang.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      };
      const result = win ? await dialog.showSaveDialog(win, saveOptions) : await dialog.showSaveDialog(saveOptions);

      if (result.canceled || !result.filePath) {
        return { success: false, error: { code: 'CANCELED', message: 'Dibatalkan' } };
      }

      const content = csvService.generateTemplate();
      fs.writeFileSync(result.filePath, content, 'utf-8');
      if (shell && shell.showItemInFolder) shell.showItemInFolder(result.filePath);

      return { success: true, data: { filePath: result.filePath } };
    } catch (err) {
      logger.error('IPC import:downloadTemplate error', { error: err.message });
      return { success: false, error: { code: 'TEMPLATE_ERROR', message: err.message } };
    }
  });

  // ── QR Code ────────────────────────────────────────────────────────────────

  ipc.handle('qr:generateForPart', async (_, partId) => {
    try {
      const partRes = partsRepo.getPartById(partId);
      if (!partRes.success) return partRes;
      const part = partRes.data;
      const qrData = await qrGenerator.generateForPart(part);
      partsRepo.updatePart(partId, {
        qrGeneratedAt: new Date().toISOString(),
        qrPayloadHash: qrData.hash,
      });
      return { success: true, data: { ...qrData, part } };
    } catch (err) {
      logger.error('IPC qr:generateForPart error', { partId, error: err.message });
      return { success: false, error: { code: 'QR_ERROR', message: err.message } };
    }
  });

  ipc.handle('qr:getDataUrl', async (_, payload, size) => {
    try {
      const dataUrl = await qrGenerator.generateDataUrl(payload, { size: size || 256 });
      return { success: true, data: { dataUrl } };
    } catch (err) {
      logger.error('IPC qr:getDataUrl error', { error: err.message });
      return { success: false, error: { code: 'QR_ERROR', message: err.message } };
    }
  });

  ipc.handle('qr:peekNext', async () => {
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
