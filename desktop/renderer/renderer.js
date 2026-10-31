const form = document.querySelector('#study-form');
const preview = document.querySelector('#preview');
const prompt = document.querySelector('#prompt');
const feedback = document.querySelector('#feedback');
const copy = document.querySelector('#copy');
let preparedInput = null;
let revision = 0;
let hasImage = false;
let busy = false;
const image = document.querySelector('#image');
const source = document.querySelector('#source');
const consent = document.querySelector('#consent');
const answer = document.querySelector('#answer');
const answerSection = document.querySelector('#answer-section');
const ask = document.querySelector('#ask');
const cancel = document.querySelector('#cancel');
document.querySelector('#pin').addEventListener('change', async event => {
  try { await window.study.pin(event.target.checked); }
  catch { event.target.checked = false; feedback.textContent = 'Could not change the window position.'; }
});

function input() {
  return { question: form.question.value, context: form.context.value, mode: form.mode.value };
}
function invalidate() {
  revision += 1;
  preparedInput = null;
  preview.hidden = true;
  prompt.textContent = '';
  consent.checked = false;
  answer.textContent = '';
  answerSection.hidden = true;
  feedback.textContent = 'Inputs changed. Preview and review the current request.';
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
    feedback.textContent = 'Request prepared locally. Review the text and screenshot before asking.';
  } catch (error) {
    if (current === revision) feedback.textContent = error.message;
  }
});
document.querySelector('#sources').addEventListener('click', async () => {
  try {
    if (busy) return;
    await clearImage();
    const sources = await window.study.sources();
    source.replaceChildren(new Option('Choose a source', ''));
    for (const item of sources) source.add(new Option(item.name, item.id));
    feedback.textContent = sources.length ? 'Choose a screen or window, then capture it.' : 'No screens or windows were found.';
  } catch { feedback.textContent = 'Could not list screens and windows.'; }
});
document.querySelector('#capture').addEventListener('click', async () => {
  if (!source.value || busy) return;
  invalidate();
  hasImage = false;
  image.hidden = true;
  image.removeAttribute('src');
  document.querySelector('#image-info').textContent = 'Capturing selected source…';
  const current = revision;
  try {
    const captured = await window.study.capture(source.value);
    if (current !== revision) return;
    image.src = captured.image;
    image.hidden = false;
    hasImage = true;
    document.querySelector('#image-info').textContent = `Captured: ${captured.name}. Review the image before sending.`;
    feedback.textContent = 'Screen captured locally. Prepare your question and review before sending.';
  } catch (error) {
    if (current === revision) { document.querySelector('#image-info').textContent = 'No capture selected.'; feedback.textContent = error.message; }
  }
});
async function clearImage() {
  invalidate();
  hasImage = false;
  image.hidden = true;
  image.removeAttribute('src');
  document.querySelector('#image-info').textContent = 'No capture selected.';
  await window.study.clearImage();
}
source.addEventListener('change', () => {
  clearImage().catch(error => { feedback.textContent = error.message; });
});
document.querySelector('#remove-image').addEventListener('click', clearImage);
ask.addEventListener('click', async () => {
  if (!preparedInput || !hasImage || !consent.checked || busy) { feedback.textContent = 'Capture a screen, prepare a question, and confirm your review first.'; return; }
  const key = document.querySelector('#api-key').value;
  if (!key) { feedback.textContent = 'Enter your OpenAI API key.'; return; }
  busy = true;
  answer.textContent = '';
  answerSection.hidden = true;
  source.disabled = true;
  const current = revision;
  form.querySelectorAll('input,textarea,button').forEach(element => { element.disabled = true; });
  document.querySelector('#sources').disabled = true;
  document.querySelector('#capture').disabled = true;
  ask.disabled = true;
  cancel.disabled = false;
  feedback.textContent = 'Waiting for OpenAI. Cancelling may not prevent provider charges.';
  try {
    const result = await window.study.ask({ input: preparedInput, key });
    if (current !== revision) return;
    answer.textContent = result.answer;
    answerSection.hidden = false;
    answerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    feedback.textContent = 'Answer received. Check its reasoning before relying on it.';
  } catch (error) { if (current === revision) feedback.textContent = error.message; }
  finally {
    busy = false;
    source.disabled = false;
    consent.checked = false;
    form.querySelectorAll('input,textarea,button').forEach(element => { element.disabled = false; });
    document.querySelector('#sources').disabled = false;
    document.querySelector('#capture').disabled = false;
    ask.disabled = false;
    cancel.disabled = true;
  }
});
cancel.addEventListener('click', async () => {
  revision++;
  await window.study.cancel();
  consent.checked = false;
  feedback.textContent = 'Cancelled locally. The provider may still process and bill the request.';
});
copy.addEventListener('click', async () => {
  if (!preparedInput) return;
  const current = revision;
  copy.disabled = true;
  try {
    await window.study.copy(preparedInput);
    if (current === revision) feedback.textContent = 'Request copied. Copying does not send it to a provider.';
  } catch (error) {
    if (current === revision) feedback.textContent = error.message;
  } finally {
    copy.disabled = false;
  }
});
document.querySelector('#clear').addEventListener('click', () => {
  form.reset();
  document.querySelector('#api-key').value = '';
  clearImage();
  feedback.textContent = 'Session cleared. Anything previously copied remains in the system clipboard.';
});
