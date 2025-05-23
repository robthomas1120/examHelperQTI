const { contextBridge, ipcRenderer } = require('electron');

// Expose the downloadTemplate function from the main process to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  downloadTemplate: (templateName) => ipcRenderer.invoke('download-template', templateName)
});
