const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  printInvoice: () => ipcRenderer.send('print-invoice')
});
