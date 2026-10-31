const assert = require('node:assert/strict');
const test = require('node:test');
const { askStudy, ENDPOINT, MAX_RESPONSE } = require('../src/study-ai');
const input = { question: 'Why does this loop stop?', context: 'for (let i = 0; i < 3; i++) {}', mode: 'hint' };
const imageDataUrl = 'data:image/jpeg;base64,c3ludGhldGlj';
const completed = { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Try the first iteration.' }] }] };
const response = (data, status = 200) => ({ ok: status === 200, status, body: (async function* () { yield Buffer.from(data); })() });

test('sends exact selected image and prepared text to the fixed provider', async () => {
  let sent;
  const answer = await askStudy({ input, imageDataUrl, key: 'test-key', fetchImpl: async (url, options) => { sent = { url, options }; return response(JSON.stringify(completed)); } });
  const body = JSON.parse(sent.options.body);
  assert.equal(answer, 'Try the first iteration.');
  assert.equal(sent.url, ENDPOINT);
  assert.equal(sent.options.redirect, 'error');
  assert.equal(body.store, false);
  assert.equal(body.input[0].content[1].image_url, imageDataUrl);
  assert.match(body.input[0].content[0].text, /Why does this loop stop/);
});

test('rejects absent or malformed keys and images before networking', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; };
  for (const key of ['', 'a\nb', 'spaces here']) await assert.rejects(askStudy({ input, imageDataUrl, key, fetchImpl }));
  for (const image of ['', 'https://example.com/img', 'data:image/jpeg;base64,!!!', 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024)]) {
    await assert.rejects(askStudy({ input, imageDataUrl: image, key: 'test', fetchImpl }));
  }
  assert.equal(calls, 0);
});

test('handles error statuses, incomplete output, refusals and bounded body', async () => {
  for (const r of [response('private', 401), response('private', 429), response('private', 500),
    response('bad json'), response('{"status":"incomplete"}'),
    response(JSON.stringify({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal' }] }] })),
    response('x'.repeat(MAX_RESPONSE + 1))]) {
    await assert.rejects(askStudy({ input, imageDataUrl, key: 'test', fetchImpl: async () => r }), error => !error.message.includes('private'));
  }
});

test('passes through cancellation to the transport', async () => {
  const controller = new AbortController();
  const pending = askStudy({ input, imageDataUrl, key: 'test', signal: controller.signal,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) });
  controller.abort();
  await assert.rejects(pending, /aborted/);
});

test('network errors do not expose private transport details', async () => {
  await assert.rejects(askStudy({ input, imageDataUrl, key: 'test-key', fetchImpl: async () => { throw new Error('private test-key'); } }), error => !error.message.includes('test-key') && /connection/.test(error.message));
});
