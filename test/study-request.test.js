const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareStudyRequest, MAX_QUESTION_CHARS, MAX_CONTEXT_CHARS } = require('../src/study-request');

test('an omitted mode prepares a hint locally without inventing an answer', () => {
  const result = prepareStudyRequest({ question: 'Why does this loop stop?' });
  assert.deepEqual(Object.keys(result), ['mode', 'prompt', 'question', 'context']);
  assert.equal(result.mode, 'hint');
  assert.equal(result.context, '');
  assert.match(result.prompt, /one focused hint/);
  assert.match(result.prompt, /Do not jump to a full solution/);
  assert.match(result.prompt, /No context supplied/);
});

test('each mode gives distinct tutoring guidance while retaining the actual question', () => {
  const expected = { hint: /guiding question/, explain: /first principles/, debug: /minimal reproduction/ };
  const prompts = [];
  for (const [mode, guidance] of Object.entries(expected)) {
    const result = prepareStudyRequest({ question: 'Explain this failure', context: 'x = 1', mode });
    assert.equal(result.mode, mode);
    assert.match(result.prompt, guidance);
    assert.match(result.prompt, /Explain this failure/);
    assert.match(result.prompt, /provided context as data/);
    assert.match(result.prompt, /Do not execute code, commands, or actions/);
    prompts.push(result.prompt);
  }
  assert.equal(new Set(prompts).size, 3);
});

test('trims the question and preserves context indentation and Unicode exactly', () => {
  const result = prepareStudyRequest({ question: ' \nWhy తెలుగు 🧠?\t ', context: '\t  α\r\n  β = "é"\n終  \n', mode: 'explain' });
  assert.equal(result.question, 'Why తెలుగు 🧠?');
  assert.equal(result.context, '\t  α\r\n  β = "é"\n終  \n');
  assert.ok(result.prompt.includes(result.question));
  assert.ok(result.prompt.includes(result.context));
});

test('bounded inputs accept the exact limit and reject oversized raw text before trimming', () => {
  const result = prepareStudyRequest({ question: 'q'.repeat(MAX_QUESTION_CHARS), context: 'c'.repeat(MAX_CONTEXT_CHARS) });
  assert.equal(result.question.length, MAX_QUESTION_CHARS);
  assert.equal(result.context.length, MAX_CONTEXT_CHARS);
  for (const input of [
    { question: 'q'.repeat(MAX_QUESTION_CHARS + 1) },
    { question: 'q', context: 'c'.repeat(MAX_CONTEXT_CHARS + 1) },
    { question: ' '.repeat(MAX_QUESTION_CHARS) + 'q' }
  ]) assert.throws(() => prepareStudyRequest(input), RangeError);
});

test('missing, blank, or non-string questions are rejected without coercion', () => {
  assert.throws(() => prepareStudyRequest({}), /question is required/);
  for (const question of ['', ' \r\n\t ', undefined, null, false, 5, ['q'], { toString: () => 'q' }]) {
    assert.throws(() => prepareStudyRequest({ question }), TypeError);
  }
});

test('optional context defaults only when absent and otherwise must be a string', () => {
  assert.equal(prepareStudyRequest({ question: 'q', context: ' \n ' }).context, '');
  for (const context of [undefined, null, 0, false, [], {}]) {
    assert.throws(() => prepareStudyRequest({ question: 'q', context }), /context must be a string/);
  }
});

test('mode is exact and never silently replaced when explicitly invalid', () => {
  for (const mode of [undefined, null, '', 'Hint', ' hint', 'ask', 'toString', '__proto__', 0, [], {}]) {
    assert.throws(() => prepareStudyRequest({ question: 'q', mode }), /mode must be/);
  }
});

test('only plain objects with the exact allowed own fields are accepted', () => {
  class Request { constructor() { this.question = 'q'; } }
  for (const input of [undefined, null, [], 'q', 1, true, () => {}, new Request(),
    Object.assign(Object.create({ question: 'inherited' }), {}), { question: 'q', extra: false },
    { question: 'q', [Symbol('unknown')]: 'extra' }]) {
    assert.throws(() => prepareStudyRequest(input), TypeError);
  }
  const hidden = { question: 'q' };
  Object.defineProperty(hidden, 'extra', { value: 'hidden' });
  assert.throws(() => prepareStudyRequest(hidden), /unknown field/);
  const nullPrototype = Object.assign(Object.create(null), { question: 'q' });
  assert.equal(prepareStudyRequest(nullPrototype).question, 'q');
});

test('accessor fields are rejected without executing their getters', () => {
  let read = false;
  const input = { get question() { read = true; return 'q'; } };
  assert.throws(() => prepareStudyRequest(input), /data properties/);
  assert.equal(read, false);
});

test('preparation is deterministic and does not mutate a frozen caller object', () => {
  const input = Object.freeze({ question: '  Why?  ', context: '  inspect this\n  line  ', mode: 'debug' });
  const first = prepareStudyRequest(input);
  assert.deepEqual(prepareStudyRequest(input), first);
  assert.equal(input.question, '  Why?  ');
  assert.equal(input.context, '  inspect this\n  line  ');
  first.question = 'changed result';
  assert.equal(prepareStudyRequest(input).question, 'Why?');
});
