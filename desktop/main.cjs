// CueDesk modifications, 27 October 2026. Upstream Cue remains in main.js/src/.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, clipboard, ipcMain, session } = require('electron');
const { prepareStudyRequest } = require('../src/study-request');
console.info('[CueDesk] Starting offline study workspace');

app.setName('CueDesk');
let window;

app.whenReady().then(() => {
  console.info('[CueDesk] Desktop runtime ready');
  // This foundation reads no upstream credentials or history and has no network path.
  const localSession = session.fromPartition('cuedesk-study');
  localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  localSession.setPermissionCheckHandler(() => false);
  const rendererRoot = pathToFileURL(path.join(__dirname, 'renderer') + path.sep).href;
  localSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith(rendererRoot) });
  });

  window = new BrowserWindow({
    width: 880, height: 760, minWidth: 660, minHeight: 600,
    title: 'CueDesk — Study workspace', backgroundColor: '#111820',
    autoHideMenuBar: true, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), session: localSession,
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());

  function request(event, payload) {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) {
      throw new Error('Request must come from the study workspace');
    }
    return prepareStudyRequest(payload);
  }
  ipcMain.handle('study:prepare', (event, payload) => request(event, payload));
  ipcMain.handle('study:copy', (event, payload) => {
    const prepared = request(event, payload);
    clipboard.writeText(prepared.prompt);
    return { copied: true };
  });
  window.loadFile(path.join(__dirname, 'renderer/index.html')).then(() => {
    window.show();
    console.info('[CueDesk] Study interface loaded; visible=' + window.isVisible());
  }).catch(error => {
    console.error('[CueDesk] Cannot load study interface:', error.message);
    app.exit(1);
  });
});

app.on('window-all-closed', () => app.quit());
