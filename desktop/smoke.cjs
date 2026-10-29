// Reproducible native-runtime check using synthetic text only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, clipboard } = require('electron');

const output = path.join(__dirname, '..', 'out');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'desktop-smoke-profile'));
// Exercise the real IPC copy path without reading or replacing the user's clipboard.
let copied = null;
clipboard.writeText = text => { copied = text; };
const timeout = setTimeout(() => { console.error('Desktop smoke timed out'); app.exit(1); }, 15000);

app.once('browser-window-created', (_event, window) => {
  window.webContents.once('did-finish-load', async () => {
    try {
      const result = await window.webContents.executeJavaScript(`(async () => {
        const form = document.querySelector('#study-form');
        const question = document.querySelector('#question');
        const context = document.querySelector('#context');
        const preview = document.querySelector('#preview');
        question.value = 'Why does this loop skip the last item?';
        context.value = 'for (let i = 0; i < items.length - 1; i++) visit(items[i]);';
        question.dispatchEvent(new Event('input', { bubbles: true }));
        const shown = new Promise((resolve, reject) => {
          const observer = new MutationObserver(() => {
            if (!preview.hidden) { observer.disconnect(); clearTimeout(timer); resolve(); }
          });
          const timer = setTimeout(() => { observer.disconnect(); reject(new Error('Preview did not appear')); }, 3000);
          observer.observe(preview, { attributes: true, attributeFilter: ['hidden'] });
        });
        form.requestSubmit();
        await shown;
        const prompt = document.querySelector('#prompt').textContent;
        const copied = new Promise((resolve, reject) => {
          const observer = new MutationObserver(() => {
            if (document.querySelector('#feedback').textContent.startsWith('Copied')) {
              observer.disconnect(); clearTimeout(timer); resolve();
            }
          });
          const timer = setTimeout(() => { observer.disconnect(); reject(new Error('Copy IPC did not complete')); }, 3000);
          observer.observe(document.querySelector('#feedback'), { childList: true, subtree: true });
        });
        document.querySelector('#copy').click();
        await copied;
        context.value = 'Changed context';
        context.dispatchEvent(new Event('input', { bubbles: true }));
        const stalePreviewHidden = preview.hidden && document.querySelector('#prompt').textContent === '';
        document.querySelector('#clear').click();
        return { prompt, stalePreviewHidden, cleared: question.value === '' && context.value === '',
          bridge: Object.keys(window.study).sort(), nodeExposed: typeof require !== 'undefined' };
      })()`);
      assert.match(result.prompt, /one focused hint/);
      assert.match(result.prompt, /items.length - 1/);
      assert.equal(copied, result.prompt);
      assert.equal(result.stalePreviewHidden, true);
      assert.equal(result.cleared, true);
      assert.deepEqual(result.bridge, ['copy', 'prepare']);
      assert.equal(result.nodeExposed, false);
      // Render a deterministic example again for a screenshot of this app only.
      await window.webContents.executeJavaScript(`document.querySelector('#question').value = 'Why does this loop skip the last item?'; document.querySelector('#context').value = 'for (let i = 0; i < items.length - 1; i++) visit(items[i]);'; document.querySelector('#question').dispatchEvent(new Event('input', { bubbles: true }));`);
      const screenshot = await window.webContents.capturePage();
      fs.writeFileSync(path.join(output, 'study-desktop.png'), screenshot.toPNG());
      clearTimeout(timeout);
      console.info('Desktop smoke passed: preview, copy IPC, stale-context clearing, sandbox bridge, session clear.');
      window.close();
      app.quit();
    } catch (error) {
      clearTimeout(timeout);
      console.error(error.stack);
      app.exit(1);
    }
  });
});
require('./main.cjs');
