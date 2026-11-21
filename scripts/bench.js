'use strict';
// Speed of chat models on one short broken sentence, streamed so the first word and the end are timed apart:
//   PROOFREAD_KEY=... node scripts/bench.js [--runs=2] [--extra='{"reasoning_effort":"none"}'] [model ...]
// No models given = every chat model the server lists. Spends ~150-500 tokens per request.
const { DEFAULTS, PROMPTS, RULES, endpoint, authHeaders, listModels } = require('../api.js');

const key = process.env.PROOFREAD_KEY;
if (!key) { console.error('set PROOFREAD_KEY'); process.exit(2); }
const args = process.argv.slice(2);
const opt = name => (args.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const RUNS = +opt('runs') || 2;
const EXTRA = opt('extra') ? JSON.parse(opt('extra')) : {};
const TEXT = process.env.PROOFREAD_TEXT || 'привит я твой маладой чилавек и я очен хачю памидари тваи целоват';
const s = { ...DEFAULTS, key, base: process.env.PROOFREAD_BASE || DEFAULTS.base };

async function once(model) {
  const t0 = performance.now();
  let first = 0, text = '', usage = null, buf = '';
  try {
    const r = await fetch(endpoint(s.base, '/chat/completions'), {
      method: 'POST',
      headers: authHeaders(key),
      body: JSON.stringify({ model, stream: true, stream_options: { include_usage: true }, ...EXTRA,
        messages: [{ role: 'system', content: PROMPTS.fix + RULES }, { role: 'user', content: TEXT }] }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) return { error: `${r.status} ${(await r.text()).slice(0, 160)}` };
    const dec = new TextDecoder();
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith('data:') || line === 'data: [DONE]') continue;
        const j = JSON.parse(line.slice(5));
        const d = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
        if (d) { if (!first) first = performance.now() - t0; text += d; }
        if (j.usage) usage = j.usage;
      }
    }
  } catch (e) { return { error: e.message }; }
  return { first, total: performance.now() - t0, text: text.trim(), usage };
}

const sec = ms => (ms / 1000).toFixed(1) + 's';

(async () => {
  const models = args.filter(a => !a.startsWith('--'));
  const list = models.length ? models : await listModels(s);
  console.log(`text: ${TEXT}\nextra: ${JSON.stringify(EXTRA)}  runs: ${RUNS}\n`);
  const rows = [];
  for (let i = 0; i < list.length; i++) { // one request at a time: tooken.club queues more than 2 per key, which skews the timing
    await Promise.all(list.slice(i, i + 1).map(async model => {
      const res = [];
      for (let k = 0; k < RUNS; k++) res.push(await once(model));
      const good = res.filter(r => !r.error);
      if (!good.length) return rows.push({ model, line: `${model.padEnd(26)} ERROR ${res[0].error}` });
      const avg = f => good.reduce((a, r) => a + f(r), 0) / good.length;
      const u = good[good.length - 1].usage || {};
      const reasoning = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0;
      rows.push({ model, total: avg(r => r.total), line: `${model.padEnd(26)} first ${sec(avg(r => r.first)).padStart(6)}  total ${sec(avg(r => r.total)).padStart(6)}`
        + `  tokens ${String(u.total_tokens || '?').padStart(4)} (reasoning ${reasoning})  ${good[good.length - 1].text}` });
    }));
  }
  rows.sort((a, b) => (a.total || 1e9) - (b.total || 1e9)).forEach(r => console.log(r.line));
})().catch(e => { console.error(e.message); process.exit(1); });
