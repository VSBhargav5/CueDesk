const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('study', {
  prepare: payload => ipcRenderer.invoke('study:prepare', payload),
  copy: payload => ipcRenderer.invoke('study:copy', payload),
  sources: () => ipcRenderer.invoke('study:sources'),
  capture: id => ipcRenderer.invoke('study:capture', id),
  clearImage: () => ipcRenderer.invoke('study:clear-image'),
  ask: payload => ipcRenderer.invoke('study:ask', payload),
  cancel: () => ipcRenderer.invoke('study:cancel'),
  pin: pinned => ipcRenderer.invoke('study:pin', pinned),
});
