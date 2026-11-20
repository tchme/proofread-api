'use strict';
// The extension in real headless Chrome: PROOFREAD_KEY=... node scripts/e2e.js  (CHROME=path to override; SKIP without Chrome).
// CDP over a pipe, own temp profile; the test page is served by CDP Fetch on a fake host, the API calls go to the real server
// (~4 requests, ~800 tokens). The harness follows textexpander's tests/real.js.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawn } = require('node:child_process');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(CHROME)) { console.log(`SKIP (Chrome not found: ${CHROME}; set CHROME=path)`); process.exit(0); }
const KEY = process.env.PROOFREAD_KEY;
if (!KEY) { console.error('set PROOFREAD_KEY'); process.exit(2); }

const EXT = path.resolve(__dirname, '..');
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'proofread-e2e-'));
const PAGE = `<!doctype html><meta charset=utf-8><title>t</title><body style="font:16px sans-serif;padding:40px">
<textarea id=ta rows=3 cols=70>пажалуста пришлите отчет до пятницы я его проверю и вирну вам с коментариями</textarea>
<p id=en>The release has been moved to Thursday because half of the team is still on vacation.</p>
<div id=ce contenteditable=true style="border:1px solid #ccc;padding:8px">Короче я посмотрел макет в целом всё норм но кнопки надо сделать побольше</div>
<p id=ru>Это обычный русский текст на странице.</p>
<input id=pw type=password value="секретный пароль">
<script>window.pageClicks = 0; document.addEventListener('click', () => window.pageClicks++);</script>`;

const SHOTS = process.env.PROOFREAD_SHOTS; // a folder: screenshots of the toolbar and the cards go there
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
let checks = 0;
const ok = (name, cond, detail = '') => { if (!cond) throw new Error('FAIL ' + name + '  -> ' + String(detail).slice(0, 500)); checks++; console.log('ok  ' + name); };

const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${PROFILE}`, '--enable-unsafe-extension-debugging',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let buf = '', seq = 0;
const waiting = new Map();
const cdp = (method, params = {}, sessionId) => new Promise((good, bad) => {
  const n = ++seq;
  setTimeout(() => { if (waiting.delete(n)) bad(new Error(method + ': no answer in 20 s')); }, 20000);
  waiting.set(n, m => m.error ? bad(new Error(method + ': ' + m.error.message)) : good(m.result));
  proc.stdio[3].write(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
});
proc.stdio[4].on('data', d => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\0')) >= 0) {
    const m = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    else if (m.method === 'Fetch.requestPaused') {
      const body = /favicon/.test(m.params.request.url) ? '' : PAGE;
      cdp('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: body ? 200 : 404,
        responseHeaders: [{ name: 'content-type', value: 'text/html; charset=utf-8' }], body: Buffer.from(body).toString('base64') }, m.sessionId).catch(() => {});
    }
  }
});
proc.stdio[3].on('error', () => {});

async function attach(targetId) {
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const c = (m, p) => cdp(m, p, sessionId);
  const js = async expr => {
    const r = await c('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(expr.slice(0, 80) + ': ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  };
  return { cdp: c, js };
}
async function find(pred) {
  for (let i = 0; i < 100; i++) {
    const t = (await cdp('Target.getTargets')).targetInfos.find(pred);
    if (t) return t;
    await sleep(100);
  }
  throw new Error('target not found');
}

// Our UI is in a closed shadow root; CDP's DOM domain reaches it with pierce.
const findNode = (n, pred) => pred(n) ? n : [...(n.children || []), ...(n.shadowRoots || [])].reduce((f, c) => f || findNode(c, pred), null);
async function node(p, selector) {
  const { root } = await p.cdp('DOM.getDocument', { depth: -1, pierce: true });
  const host = findNode(root, n => n.nodeName === 'PROOFREAD-UI');
  if (!host) return 0;
  return (await p.cdp('DOM.querySelector', { nodeId: host.shadowRoots[0].nodeId, selector })).nodeId;
}
async function html(p, selector) {
  const n = await node(p, selector);
  return n ? (await p.cdp('DOM.getOuterHTML', { nodeId: n })).outerHTML : null;
}
const shown = async (p, selector) => { const s = await html(p, selector); return s !== null && !/^<[^>]*\shidden(=""|[\s>])/.test(s); };
const textOf = s => (s || '').replace(/<[^>]+>/g, '');

async function mouse(p, x, y, clicks = 1) {
  for (let n = 1; n <= clicks; n++) {
    await p.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: n });
    await p.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: n });
  }
  await sleep(250);
}
async function click(p, selector) {
  const n = await node(p, selector);
  if (!n) throw new Error('no ' + selector);
  const q = (await p.cdp('DOM.getBoxModel', { nodeId: n })).model.border;
  await mouse(p, (q[0] + q[4]) / 2, (q[1] + q[5]) / 2);
}
async function tripleClick(p, id) {
  const [x, y] = await p.js(`(() => { const r = document.getElementById('${id}').getBoundingClientRect(); return [r.left + 30, r.top + r.height / 2] })()`);
  await mouse(p, x, y, 3);
}
async function key(p, k, code, vk, modifiers = 0) {
  await p.cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers, key: k, code, windowsVirtualKeyCode: vk });
  await p.cdp('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, key: k, code, windowsVirtualKeyCode: vk });
  await sleep(250);
}
const alt = (p, letter) => key(p, letter, 'Key' + letter.toUpperCase(), letter.toUpperCase().charCodeAt(0), 1);
async function shot(p, name) {
  if (!SHOTS) return;
  const { data } = await p.cdp('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(data, 'base64'));
}
async function cardDone(p) {
  for (let i = 0; i < 80; i++) {
    const t = textOf(await html(p, '.title'));
    if (t && !t.endsWith('…')) return t;
    await sleep(250);
  }
  throw new Error('the card never finished');
}

(async () => {
  try {
    await sleep(1000);
    const { id } = await cdp('Extensions.loadUnpacked', { path: EXT });
    const sw = await attach((await find(t => t.type === 'service_worker' && t.url.includes(id))).targetId);
    await sw.js(`chrome.storage.local.set({ key: ${JSON.stringify(KEY)} }).then(() => 1)`);

    const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
    const p = await attach(targetId);
    await p.cdp('Fetch.enable', { patterns: [{ urlPattern: 'https://test.example/*' }] });
    await p.cdp('Page.enable');
    await p.cdp('Runtime.enable');
    await p.cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    await p.cdp('Page.navigate', { url: 'https://test.example/' });
    await sleep(1500);

    // 1. a textarea: keyboard selection, Alt+R, the diff, «Заменить текст»
    await p.js(`(() => { const t = document.getElementById('ta'); t.focus(); t.setSelectionRange(0, t.value.length); return 1 })()`);
    await alt(p, 'r');
    ok('Alt+R in a textarea: the card says the errors are fixed', await cardDone(p) === 'Ошибки исправлены', await html(p, '.card'));
    ok('changed words are highlighted', /<mark>/.test(await html(p, '.body')));
    await shot(p, '1-fix-card');
    ok('«Заменить текст» is offered for a field', await shown(p, '.replace'));
    await click(p, '.replace');
    const ta = await p.js(`document.getElementById('ta').value`);
    ok('the textarea holds the corrected text', /^Пожалуйста,/.test(ta) && ta.includes('верну'), ta);
    ok('the card closes after the replace', !(await shown(p, '.card')));
    ok('our clicks never reached the page', await p.js('window.pageClicks') === 0, await p.js('window.pageClicks'));

    // 2. page text: triple click shows the toolbar, «Перевести» gives a card without «Заменить текст», Esc closes it
    await tripleClick(p, 'en');
    ok('selecting page text shows the toolbar', await shown(p, '.toolbar'));
    const clicksBefore = await p.js('window.pageClicks');
    await click(p, '.tr');
    ok('translate: the card title', await cardDone(p) === 'Перевод на русский');
    ok('the translation is Russian', /[а-яё]{4}/i.test(textOf(await html(p, '.body'))), await html(p, '.body'));
    ok('no «Заменить текст» for page text', !(await shown(p, '.replace')));
    await click(p, '.refresh');
    ok('«Обновить» asks again: the card is loading', textOf(await html(p, '.title')).endsWith('…'));
    ok('«Обновить» brings a new translation', await cardDone(p) === 'Перевод на русский');
    await shot(p, '2-translate-card');
    ok('the toolbar click did not reach the page', await p.js('window.pageClicks') === clicksBefore);
    await key(p, 'Escape', 'Escape', 27);
    ok('Esc closes the card', !(await shown(p, '.card')));

    // 3. a contenteditable: toolbar → «Редактировать» → «Исправить ошибки» → replace
    await tripleClick(p, 'ce');
    await click(p, '.edit');
    ok('«Редактировать» opens the menu', await shown(p, '.menu'));
    await shot(p, '3-menu');
    await click(p, '.item');
    ok('fix in a contenteditable: the card title', await cardDone(p) === 'Ошибки исправлены');
    await click(p, '.replace');
    const ce = await p.js(`document.getElementById('ce').textContent`);
    ok('the contenteditable holds the corrected text', /^Короче,/.test(ce) && ce.includes(','), ce);

    // 4. Russian page text + Alt+T: answered at once, no request
    await tripleClick(p, 'ru');
    await alt(p, 't');
    ok('Alt+T on Russian text says no translation is needed', textOf(await html(p, '.title')) === 'Перевод не нужен');
    await key(p, 'Escape', 'Escape', 27);

    // 5. a password field never gets a toolbar or a hotkey
    await p.js(`(() => { const t = document.getElementById('pw'); t.focus(); t.select(); return 1 })()`);
    await alt(p, 'r');
    ok('a password field is ignored', !(await shown(p, '.card')) && !(await shown(p, '.toolbar')));

    ok('no script errors on the page', errors.length === 0, errors.join('\n'));
    console.log(`\nall ${checks} checks passed`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    try { await cdp('Browser.close'); } catch {}
    await new Promise(r => { if (proc.exitCode !== null) return r(); proc.once('exit', r); setTimeout(r, 8000); });
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  }
})();
