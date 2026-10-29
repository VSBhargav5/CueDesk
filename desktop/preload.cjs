const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('study', {
  prepare: payload => ipcRenderer.invoke('study:prepare', payload),
  copy: payload => ipcRenderer.invoke('study:copy', payload),
});
