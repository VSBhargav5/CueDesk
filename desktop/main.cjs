// CueDesk modifications, 27 October 2026. Upstream Cue remains in main.js/src/.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, clipboard, ipcMain, session, desktopCapturer } = require('electron');
const { prepareStudyRequest } = require('../src/study-request');
const { encodeScreenshot } = require('../src/screen');
const { askStudy } = require('../src/study-ai');
console.info('[CueDesk] Starting screen-study workspace');

app.setName('CueDesk');
let window;
let selectedImage = null;
let selectedSource = null;
let controller = null;
let generation = 0;

app.whenReady().then(() => {
  console.info('[CueDesk] Desktop runtime ready');
  // The renderer loads local assets; provider requests require an explicit action in the main process.
  const localSession = session.fromPartition('cuedesk-study');
  localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  localSession.setPermissionCheckHandler(() => false);
  const rendererRoot = pathToFileURL(path.join(__dirname, 'renderer') + path.sep).href;
  localSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith(rendererRoot) });
  });

  window = new BrowserWindow({
    width: 1100, height: 820, minWidth: 660, minHeight: 600,
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
  function authorized(event) {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Invalid workspace');
  }
  ipcMain.handle('study:pin', (event, pinned) => {
    authorized(event);
    if (typeof pinned !== 'boolean') throw new Error('Invalid pin setting.');
    window.setAlwaysOnTop(pinned);
  });
  ipcMain.handle('study:sources', async event => {
    authorized(event);
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 }, fetchWindowIcons: false });
    return sources.map(({ id, name }) => ({ id, name }));
  });
  ipcMain.handle('study:capture', async (event, id) => {
    authorized(event);
    if (typeof id !== 'string' || !/^(screen|window):\d+:\d+$/.test(id)) throw new Error('Choose a screen or window.');
    const requestGeneration = ++generation;
    if (controller) { controller.abort(); controller = null; }
    selectedImage = null;
    selectedSource = null;
    const kind = id.startsWith('screen:') ? 'screen' : 'window';
    const sources = await desktopCapturer.getSources({ types: [kind], thumbnailSize: { width: 1600, height: 900 }, fetchWindowIcons: false });
    if (generation !== requestGeneration) throw new Error('Selection changed; capture discarded.');
    const source = sources.find(source => source.id === id);
    if (!source || source.thumbnail.isEmpty()) throw new Error('The selected screen or window is unavailable.');
    const image = encodeScreenshot(source.thumbnail);
    if (image.length > 3 * 1024 * 1024) throw new Error('The capture is too large.');
    selectedImage = image;
    selectedSource = source.name;
    return { image, name: source.name };
  });
  ipcMain.handle('study:clear-image', event => {
    authorized(event);
    generation++;
    if (controller) controller.abort();
    controller = null;
    selectedImage = null;
    selectedSource = null;
  });
  ipcMain.handle('study:cancel', event => {
    authorized(event);
    generation++;
    if (controller) controller.abort();
    controller = null;
  });
  ipcMain.handle('study:ask', async (event, payload) => {
    authorized(event);
    if (controller) throw new Error('An AI request is already running.');
    if (!selectedImage) throw new Error('Choose and capture a screen or window first.');
    if (!payload || typeof payload !== 'object') throw new Error('Invalid request.');
    request(event, payload.input);
    const current = ++generation;
    const active = new AbortController();
    controller = active;
    const timeout = setTimeout(() => active.abort(), 60000);
    try {
      const answer = await askStudy({ input: payload.input, key: payload.key, imageDataUrl: selectedImage, signal: active.signal });
      if (current !== generation || active.signal.aborted) throw new Error('Request cancelled.');
      return { answer, source: selectedSource };
    } catch (error) {
      if (active.signal.aborted) throw new Error('Stopped waiting. The provider may still process and bill the request.');
      throw new Error(error.message || 'AI request failed.');
    } finally {
      clearTimeout(timeout);
      if (controller === active) controller = null;
    }
  });
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

app.on('window-all-closed', () => { if (controller) controller.abort(); selectedImage = null; app.quit(); });
