// One explicitly initiated request. Screen bytes and credentials stay in memory.
const { prepareStudyRequest } = require('./study-request');
const ENDPOINT = 'https://api.openai.com/v1/responses';
const MODEL = 'gpt-4.1-mini';
const MAX_RESPONSE = 1024 * 1024;

async function askStudy({ input, imageDataUrl, key, signal, fetchImpl = fetch }) {
  const { prompt } = prepareStudyRequest(input);
  if (typeof key !== 'string' || !/^[\x21-\x7e]{1,512}$/.test(key)) throw new Error('Enter an OpenAI API key.');
  if (typeof imageDataUrl !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(imageDataUrl)
      || imageDataUrl.length > 3 * 1024 * 1024) throw new Error('Choose a valid screen capture first.');
  let response;
  try { response = await fetchImpl(ENDPOINT, {
    method: 'POST', redirect: 'error', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, store: false, max_output_tokens: 1200,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt },
        { type: 'input_image', image_url: imageDataUrl, detail: 'auto' }] }] })
  }); } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not reach OpenAI. Check your connection and try again.');
  }
  if (!response.ok) throw new Error(response.status === 401 ? 'API key rejected.' :
    response.status === 429 ? 'Rate or billing limit reached.' : 'AI request failed. Check your connection and provider access.');
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_RESPONSE) throw new Error('AI response exceeded the size limit.');
    chunks.push(chunk);
  }
  let result;
  try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('The AI returned an unreadable response.'); }
  if (result.status !== 'completed' || !Array.isArray(result.output)) throw new Error('The AI response did not complete.');
  const parts = [];
  for (const message of result.output) {
    if (message?.type !== 'message' || message.role !== 'assistant' || !Array.isArray(message.content)) continue;
    for (const item of message.content) {
      if (item?.type === 'refusal') throw new Error('The provider declined this request.');
      if (item?.type === 'output_text' && typeof item.text === 'string') parts.push(item.text);
    }
  }
  const answer = parts.join('\n\n').trim();
  if (!answer) throw new Error('The AI returned no answer.');
  return answer;
}

module.exports = { askStudy, ENDPOINT, MODEL, MAX_RESPONSE };
