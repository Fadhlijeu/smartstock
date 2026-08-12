/**
 * preload.js — Context Bridge untuk SAP StockMon
 * Expose window.api ke renderer secara aman.
 * Renderer tidak boleh akses Node.js langsung.
 */

const { contextBridge, ipcRenderer } = require('electron');

// ─── EXPOSE API ─────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('api', {

  // ── Parts CRUD ─────────────────────────────────────────────────────────────
  getParts: (filters) => ipcRenderer.invoke('parts:getAll', filters),
  getPartById: (id) => ipcRenderer.invoke('parts:getById', id),
  getPartByQrId: (qrId) => ipcRenderer.invoke('parts:getByQrId', qrId),
  getPartBySerialNumber: (serialNumber) => ipcRenderer.invoke('parts:getBySerialNumber', serialNumber),
  createPart: (data) => ipcRenderer.invoke('parts:create', data),
  updatePart: (id, data) => ipcRenderer.invoke('parts:update', id, data),
  deletePart: (id) => ipcRenderer.invoke('parts:delete', id),
  getKpiStats: () => ipcRenderer.invoke('parts:kpiStats'),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  updateSettings: (data) => ipcRenderer.invoke('settings:update', data),

  // ── QR ─────────────────────────────────────────────────────────────────────
  generateQR: (partId) => ipcRenderer.invoke('qr:generate', partId),
  generateBatchQR: (partIds) => ipcRenderer.invoke('qr:generateBatch', partIds),

  // ── Transactions ───────────────────────────────────────────────────────────
  getTransactions: (filters) => ipcRenderer.invoke('transactions:getAll', filters),
  createTransaction: (data) => ipcRenderer.invoke('transactions:create', data),
  undoLastTransaction: () => ipcRenderer.invoke('transactions:undoLast'),

  // ── Export ─────────────────────────────────────────────────────────────────
  exportExcel: (type, filters) => ipcRenderer.invoke('export:excel', type, filters),
  exportPDF: (type, filters) => ipcRenderer.invoke('export:pdf', type, filters),

  // ── Import ─────────────────────────────────────────────────────────────────
  importCSV: (filePath) => ipcRenderer.invoke('import:csv', filePath),
  importConfirm: (rows) => ipcRenderer.invoke('import:confirm', rows),
  downloadCSVTemplate: () => ipcRenderer.invoke('import:downloadTemplate'),
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options),

  // ── App ────────────────────────────────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  openDataDir: () => ipcRenderer.invoke('app:openDataDir'),

  // ── QR Code ────────────────────────────────────────────────────────────────
  qrGenerateForPart: (partId) => ipcRenderer.invoke('qr:generateForPart', partId),
  qrGetDataUrl: (payload, size) => ipcRenderer.invoke('qr:getDataUrl', payload, size),
  qrPeekNext: () => ipcRenderer.invoke('qr:peekNext'),

  // ── Real-time Events (Main → Renderer) ─────────────────────────────────────
  onStockUpdated: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('stock-updated', handler);
    return () => ipcRenderer.removeListener('stock-updated', handler); // Cleanup
  },
  onScanError: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('scan-error', handler);
    return () => ipcRenderer.removeListener('scan-error', handler);
  },
  onImportProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('import-progress', handler);
    return () => ipcRenderer.removeListener('import-progress', handler);
  },
});
