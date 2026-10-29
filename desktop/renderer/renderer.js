const form = document.querySelector('#study-form');
const preview = document.querySelector('#preview');
const prompt = document.querySelector('#prompt');
const feedback = document.querySelector('#feedback');
const copy = document.querySelector('#copy');
let preparedInput = null;
let revision = 0;

function input() {
  return { question: form.question.value, context: form.context.value, mode: form.mode.value };
}
function invalidate() {
  revision += 1;
  preparedInput = null;
  preview.hidden = true;
  prompt.textContent = '';
  feedback.textContent = 'Ready to preview. Nothing has been sent.';
}
form.addEventListener('input', invalidate);
form.addEventListener('submit', async event => {
  event.preventDefault();
  const current = ++revision;
  const payload = input();
  try {
    const result = await window.study.prepare(payload);
    if (current !== revision) return;
    preparedInput = payload;
    prompt.textContent = result.prompt;
    preview.hidden = false;
    feedback.textContent = 'Request prepared locally. Review it before copying.';
  } catch (error) {
    if (current === revision) feedback.textContent = error.message;
  }
});
copy.addEventListener('click', async () => {
  if (!preparedInput) return;
  const current = revision;
  copy.disabled = true;
  try {
    await window.study.copy(preparedInput);
    if (current === revision) feedback.textContent = 'Copied to your clipboard. No provider was contacted.';
  } catch (error) {
    if (current === revision) feedback.textContent = error.message;
  } finally {
    copy.disabled = false;
  }
});
document.querySelector('#clear').addEventListener('click', () => {
  form.reset();
  invalidate();
  feedback.textContent = 'Session cleared. Anything previously copied remains in the system clipboard.';
});
