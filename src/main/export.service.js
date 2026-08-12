/**
 * export.service.js - Excel exports for stock and transaction reports.
 */

'use strict';

const ExcelJS = require('exceljs');
const partsRepo = require('./db/parts.repository');
const transactionsRepo = require('./db/transactions.repository');

function styleWorksheet(worksheet) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  worksheet.getRow(1).alignment = { vertical: 'middle' };
  worksheet.getRow(1).height = 22;
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columnCount },
  };
}

function autoWidth(worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value == null ? '' : String(cell.value);
      maxLength = Math.max(maxLength, Math.min(value.length + 2, 48));
    });
    column.width = maxLength;
  });
}

async function writeWorkbook(workbook, filePath) {
  workbook.creator = 'SAP StockMon';
  workbook.created = new Date();
  workbook.modified = new Date();
  await workbook.xlsx.writeFile(filePath);
  return { success: true, data: { filePath } };
}

async function exportStockSnapshot(filePath, filters = {}) {
  const partsRes = partsRepo.getParts({ ...filters, limit: 100000, offset: 0 });
  if (!partsRes.success) return partsRes;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock Snapshot');
  sheet.columns = [
    { header: 'QR ID', key: 'qrId' },
    { header: 'Serial Number', key: 'serialNumber' },
    { header: 'Description', key: 'description' },
    { header: 'Category', key: 'category' },
    { header: 'Status', key: 'status' },
    { header: 'Current Qty', key: 'currentQty' },
    { header: 'Initial Qty', key: 'initialQty' },
    { header: 'Unit', key: 'unit' },
    { header: 'Min Qty', key: 'minQty' },
    { header: 'MR Invoice', key: 'mrInvoice' },
    { header: 'Purchase Order', key: 'purchaseOrder' },
    { header: 'Date Entry', key: 'dateEntry' },
  ];

  partsRes.data.forEach((part) => sheet.addRow(part));
  styleWorksheet(sheet);
  autoWidth(sheet);
  return writeWorkbook(workbook, filePath);
}

async function exportLowStock(filePath) {
  return exportStockSnapshot(filePath, { status: 'LOW' });
}

async function exportTransactionLog(filePath, filters = {}) {
  const txRes = transactionsRepo.getTransactions({ ...filters, limit: 100000, offset: 0 });
  if (!txRes.success) return txRes;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transaction Log');
  sheet.columns = [
    { header: 'Scanned At', key: 'scannedAt' },
    { header: 'Direction', key: 'direction' },
    { header: 'QR ID', key: 'qrId' },
    { header: 'Serial Number', key: 'serialNumber' },
    { header: 'Description', key: 'partDescription' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Qty Before', key: 'qtyBefore' },
    { header: 'Qty After', key: 'qtyAfter' },
    { header: 'Unit', key: 'unit' },
    { header: 'Scan Method', key: 'scanMethod' },
    { header: 'Operator', key: 'operator' },
    { header: 'Note', key: 'note' },
  ];

  txRes.data.forEach((tx) => sheet.addRow(tx));
  styleWorksheet(sheet);
  autoWidth(sheet);
  return writeWorkbook(workbook, filePath);
}

module.exports = { exportStockSnapshot, exportLowStock, exportTransactionLog };
