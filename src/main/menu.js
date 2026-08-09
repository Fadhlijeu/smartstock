/**
 * menu.js — Application menu untuk SAP StockMon
 */

const { Menu, shell } = require('electron');

/**
 * Build dan set application menu
 * @param {BrowserWindow} mainWindow
 */
function buildMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import CSV...',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.send('menu:importCSV'),
        },
        {
          label: 'Export Excel...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:exportExcel'),
        },
        { type: 'separator' },
        {
          label: 'Open Data Folder',
          click: () => mainWindow.webContents.executeJavaScript("window.api.openDataDir()"),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Keluar' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Pilih Semua' },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'toggleDevTools', label: 'Developer Tools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Reset Zoom' },
        { role: 'zoomIn', label: 'Perbesar' },
        { role: 'zoomOut', label: 'Perkecil' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Fullscreen' },
      ],
    },
    {
      label: 'Bantuan',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: '?',
          click: () => mainWindow.webContents.send('menu:showShortcuts'),
        },
        { type: 'separator' },
        {
          label: 'Tentang SAP StockMon',
          click: () => mainWindow.webContents.send('menu:showAbout'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { buildMenu };
