'use strict';
// Live check of api.js against the real server: PROOFREAD_KEY=... node scripts/smoke.js  (PROOFREAD_MODEL to try another model).
// Spends ~1000 tokens: the model list, the four actions, one request with a wrong key.
const { DEFAULTS, complete, listModels } = require('../api.js');

const key = process.env.PROOFREAD_KEY;
if (!key) { console.error('set PROOFREAD_KEY'); process.exit(2); }
const s = { ...DEFAULTS, key, base: process.env.PROOFREAD_BASE || DEFAULTS.base, model: process.env.PROOFREAD_MODEL || DEFAULTS.model };
const SAMPLES = [
  ['fix', 'Когда я пришел домой то увидел что дверь открыта хотя точно помню что закрывал ее'],
  ['rephrase', 'Короче я посмотрел макет в целом всё норм но кнопки надо сделать побольше'],
  ['style', 'В данный момент времени мы осуществляем проведение работ по улучшению качества сервиса'],
  ['translate', 'The release has been moved to Thursday because half of the team is still on vacation.'],
];

(async () => {
  const ids = await listModels(s);
  console.log(`models for chat: ${ids.length}; ${s.model} ${ids.includes(s.model) ? 'is there' : 'is MISSING'}`);
  for (const [action, text] of SAMPLES) {
    const t = Date.now(), out = await complete(s, action, text);
    console.log(`${action} (${((Date.now() - t) / 1000).toFixed(1)}s): ${out}`);
  }
  await complete({ ...s, key: 'tc_live_wrong' }, 'fix', 'тест').then(
    () => { console.log('wrong key: NO ERROR'); process.exitCode = 1; },
    e => console.log('wrong key -> ' + e.message));
})().catch(e => { console.error(e.message); process.exit(1); });
