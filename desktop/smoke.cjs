// Native-runtime check using a synthetic capture and mocked provider.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, clipboard, desktopCapturer, nativeImage } = require('electron');
const { Readable } = require('node:stream');

const output = path.join(__dirname, '..', 'out');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'desktop-smoke-profile'));
// Exercise the real IPC copy path without reading or replacing the user's clipboard.
let copied = null;
clipboard.writeText = text => { copied = text; };
// No real screen or provider is accessed by this smoke check.
const synthetic = nativeImage.createFromBitmap(Buffer.alloc(8 * 8 * 4, 255), { width: 8, height: 8 });
desktopCapturer.getSources = async () => [{ id: 'window:10:0', name: 'Synthetic example', thumbnail: synthetic }];
let sent = null;
let requests = 0;
global.fetch = async (url, options) => {
  sent = { url, body: JSON.parse(options.body) };
  if (++requests === 2) return new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('synthetic abort')), { once: true });
  });
  return { ok: true, status: 200, body: Readable.from([Buffer.from(JSON.stringify({ status: 'completed', output: [
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Synthetic answer: test the first iteration.' }] }
  ] }))]) };
};
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
            if (document.querySelector('#feedback').textContent.startsWith('Request copied.')) {
              observer.disconnect(); clearTimeout(timer); resolve();
            }
          });
          const timer = setTimeout(() => { observer.disconnect(); reject(new Error('Copy IPC did not complete')); }, 3000);
          observer.observe(document.querySelector('#feedback'), { childList: true, subtree: true });
        });
        document.querySelector('#copy').click();
        await copied;
        const waitFor = async condition => {
          for (let i = 0; i < 100; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
          throw new Error('Screen workflow did not complete');
        };
        document.querySelector('#sources').click();
        await waitFor(() => document.querySelector('#source').options.length > 1);
        document.querySelector('#source').value = 'window:10:0';
        document.querySelector('#capture').click();
        await waitFor(() => !document.querySelector('#image').hidden);
        await waitFor(() => document.querySelector('#image').naturalWidth > 0);
        const capture = document.querySelector('#image').src;
        const source = document.querySelector('#source');
        source.value = '';
        source.dispatchEvent(new Event('change', { bubbles: true }));
        await waitFor(() => document.querySelector('#image').hidden);
        if (!preview.hidden || document.querySelector('#consent').checked) throw new Error('Source change kept stale request');
        source.value = 'window:10:0';
        source.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('#capture').click();
        await waitFor(() => !document.querySelector('#image').hidden);

        form.requestSubmit();
        await waitFor(() => !preview.hidden);
        document.querySelector('#api-key').value = 'synthetic-key';
        document.querySelector('#consent').checked = true;
        document.querySelector('#ask').click();
        await waitFor(() => !document.querySelector('#answer-section').hidden);
        const answer = document.querySelector('#answer').textContent;
        await window.study.pin(true);
        document.querySelector('#consent').checked = true;
        document.querySelector('#ask').click();
        await waitFor(() => !document.querySelector('#cancel').disabled);
        if (!document.querySelector('#answer-section').hidden || document.querySelector('#answer').textContent) throw new Error('Previous answer remained visible');
        if (!document.querySelector('#source').disabled) throw new Error('Source editable during request');
        document.querySelector('#cancel').click();
        await waitFor(() => document.querySelector('#cancel').disabled);
        const imageKeptAfterCancel = !document.querySelector('#image').hidden;
        context.value = 'Changed context';
        context.dispatchEvent(new Event('input', { bubbles: true }));
        const stalePreviewHidden = preview.hidden && document.querySelector('#prompt').textContent === '';
        document.querySelector('#clear').click();
        return { prompt, capture, answer, imageKeptAfterCancel, stalePreviewHidden, cleared: question.value === '' && context.value === '',
          bridge: Object.keys(window.study).sort(), nodeExposed: typeof require !== 'undefined' };
      })()`);
      assert.match(result.prompt, /one focused hint/);
      assert.match(result.prompt, /items.length - 1/);
      assert.equal(copied, result.prompt);
      assert.equal(result.stalePreviewHidden, true);
      assert.match(result.answer, /Synthetic answer/);
      assert.equal(result.imageKeptAfterCancel, true);
      assert.equal(window.isAlwaysOnTop(), true);
      assert.equal(sent.url, 'https://api.openai.com/v1/responses');
      assert.equal(sent.body.input[0].content[1].image_url, result.capture);
      assert.equal(result.cleared, true);
      assert.deepEqual(result.bridge, ['ask', 'cancel', 'capture', 'clearImage', 'copy', 'pin', 'prepare', 'sources']);
      assert.equal(result.nodeExposed, false);
      // Render a deterministic example again for a screenshot of this app only.
      await window.webContents.executeJavaScript(`(async () => {
        const sample = await window.study.capture('window:10:0');
        document.querySelector('#image').src = sample.image;
        document.querySelector('#image').hidden = false;
        document.querySelector('#image-info').textContent = 'Synthetic example — preview only';
        document.querySelector('#question').value = 'Why does this loop skip the last item?';
        document.querySelector('#context').value = 'for (let i = 0; i < items.length - 1; i++) visit(items[i]);';
        document.querySelector('#question').dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
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
