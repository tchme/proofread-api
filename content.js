// The toolbar over selected text, the result card and the Alt hotkeys. Uses shared.js (loaded first).
// The API is reached only through background.js: a content script's fetch would hit the page's CORS.
(() => {
  if (!(document.documentElement instanceof HTMLElement)) return; // SVG / XML documents

  const KEYS = { KeyR: 'fix', KeyU: 'rephrase', KeyY: 'style', KeyO: 'editor', KeyT: 'translate' }; // e.code: same keys in the Russian layout
  const INPUT_TYPES = new Set(['text', 'search', 'url', 'email', 'tel']); // never password
  const MENU = [
    ['fix', 'fix', 'Исправить ошибки', 'Alt+R'],
    ['rephrase', 'rephrase', 'Другими словами', 'Alt+U'],
    ['style', 'style', 'Улучшить стиль', 'Alt+Y'],
    ['editor', 'open', 'Открыть в редакторе', 'Alt+O'],
  ];

  const CSS = `
    :host { all: initial }
    [hidden] { display: none !important }
    * { box-sizing: border-box }
    .pop { position: absolute; background: #2b2b30; color: #f1f1f4; border: 1px solid #3c3c43; border-radius: 12px;
      box-shadow: 0 14px 36px rgba(10,10,20,.28), 0 2px 6px rgba(10,10,20,.14);
      font: 14px/1.5 "Segoe UI", system-ui, -apple-system, sans-serif; text-align: left; letter-spacing: normal; -webkit-font-smoothing: antialiased }
    .i { width: 18px; height: 18px; flex: none; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round }
    button { font: inherit; color: inherit; margin: 0; cursor: pointer }
    button:focus-visible { outline: 2px solid #ff5c94; outline-offset: 1px }
    .toolbar { display: flex; align-items: center; gap: 2px; padding: 4px; white-space: nowrap }
    .btn { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; font-weight: 500 }
    .btn.icon { width: 32px; padding: 0; justify-content: center; color: #9d9da8 }
    .btn:hover { background: #3b3b42; color: #f1f1f4 }
    .btn.edit { background: #4b2b3d }
    .btn.edit .i, .btn.tr .i, .item .i { color: #ff5c94 }
    .sep { width: 1px; height: 20px; background: #3c3c43; margin: 0 4px }
    .menu { top: calc(100% + 6px); left: 0; min-width: 268px; padding: 6px; display: grid }
    .item { display: grid; grid-template-columns: 20px 1fr auto; align-items: center; gap: 12px; padding: 9px 10px; border: 0; border-radius: 8px; background: transparent; font-size: 15px; text-align: left }
    .item:hover { background: #3b3b42 }
    .k { font-size: 13px; color: #9d9da8 }
    .card { width: 380px; max-width: calc(100vw - 16px) }
    .head { display: flex; align-items: center; gap: 4px; padding: 10px 8px 10px 16px; border-bottom: 1px solid #3c3c43 }
    .title { flex: 1; min-width: 0; font-weight: 600; font-size: 15px }
    .body { padding: 14px 16px 16px; font-size: 15px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 50vh; overflow: auto; user-select: text }
    .body.muted { color: #9d9da8 }
    mark { background: #1f4c35; color: #d9f6e4; border-radius: 3px; padding: 0 2px; -webkit-box-decoration-break: clone; box-decoration-break: clone }
    .foot { display: flex; gap: 8px; padding: 0 16px 16px }
    .cbtn { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; border: 0; border-radius: 9px; background: #3a3a41; font-weight: 500 }
    .cbtn:hover { background: #47474f }
    .cbtn.icon { width: 34px; padding: 0; justify-content: center }
    .sk-wrap { display: grid; gap: 10px; padding: 4px 0 }
    .sk { height: 11px; border-radius: 6px; background: linear-gradient(90deg, #3a3a41, #47474f, #3a3a41); background-size: 200% 100%; animation: sh 1.1s linear infinite }
    .sk1 { width: 94% } .sk2 { width: 78% } .sk3 { width: 52% }
    @keyframes sh { to { background-position: -200% 0 } }
    @media (prefers-reduced-motion: reduce) { .sk { animation: none } }
    .clip { position: fixed; top: 0; left: 0; width: 1px; height: 1px; opacity: 0 }
  `;

  // createElement, not innerHTML: some sites enforce Trusted Types.
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    el.append(...kids.flat());
    return el;
  }

  const host = document.createElement('pravka-ui');
  host.style.cssText = 'all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647';
  const root = host.attachShadow({ mode: 'closed' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(CSS);
  root.adoptedStyleSheets = [sheet];
  // Our clicks and keys stay ours: a composed click would reach the page retargeted to the host,
  // and a site may close its editor on a click "outside".
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'keydown', 'keyup']) {
    root.addEventListener(type, e => {
      if (type === 'mousedown' && e.target.closest('button')) e.preventDefault(); // keep the page's selection and focus
      e.stopPropagation();
    });
  }

  const iconBtn = (name, label, onclick, cls = 'btn icon') => h('button', { class: cls, type: 'button', title: label, 'aria-label': label, onclick }, icon(name));

  const menu = h('div', { class: 'pop menu', role: 'menu' }, MENU.map(([action, ic, label, key]) =>
    h('button', { class: 'item', type: 'button', role: 'menuitem', onclick: () => run(action) }, icon(ic), h('span', {}, label), h('span', { class: 'k' }, key))));
  const editBtn = h('button', { class: 'btn edit', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: () => setMenu(menu.hidden) }, icon('edit'), 'Редактировать');
  const toolbar = h('div', { class: 'pop toolbar', role: 'toolbar', 'aria-label': 'Правка' },
    editBtn,
    h('button', { class: 'btn tr', type: 'button', title: 'Перевести на русский (Alt+T)', onclick: () => run('translate') }, icon('translate'), 'Перевести'),
    h('span', { class: 'sep' }),
    iconBtn('search', 'Найти в Яндексе', search),
    iconBtn('copy', 'Копировать', e => copy(ctx.text, e.currentTarget)),
    iconBtn('close', 'Закрыть', hide),
    menu);

  const title = h('span', { class: 'title' });
  const body = h('div', { class: 'body' });
  const replaceBtn = h('button', { class: 'cbtn replace', type: 'button', onclick: replace }, icon('return'), 'Заменить текст');
  const refreshBtn = iconBtn('refresh', 'Обновить', () => run(lastAction), 'cbtn icon refresh');
  const copyBtn = iconBtn('copy', 'Копировать', e => copy(result, e.currentTarget), 'cbtn icon copy');
  const retryBtn = h('button', { class: 'cbtn retry', type: 'button', onclick: () => run(lastAction) }, 'Повторить');
  const settingsBtn = h('button', { class: 'cbtn', type: 'button', onclick: () => send({ type: 'settings' }) }, 'Настройки');
  const foot = h('div', { class: 'foot' }, replaceBtn, refreshBtn, copyBtn, retryBtn, settingsBtn);
  const card = h('div', { class: 'pop card', role: 'dialog', 'aria-label': 'Результат' },
    h('div', { class: 'head' }, title, iconBtn('panel', 'Открыть в редакторе', () => run('editor')), iconBtn('close', 'Закрыть', hide)),
    body, foot);
  root.append(toolbar, card);
  toolbar.hidden = card.hidden = menu.hidden = true;

  let ctx = null;       // the selection being worked on: { kind: 'input' | 'editable' | 'page', text, ... }
  let result = '';      // the text in the card
  let lastAction = '';
  let gen = 0;          // bumps on every new selection / close, so a late answer is dropped

  const pagePoint = e => ({ left: e.clientX + scrollX, top: e.clientY + scrollY - 12, bottom: e.clientY + scrollY + 12 });
  const pageRect = r => ({ left: r.left + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY });

  // The current selection, or null. e: the mouseup that made it (gives a place for text inside inputs).
  function capture(e) {
    const el = document.activeElement;
    if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
      // Chrome's getSelection() also sees text selected inside inputs, so a password field must stop here
      if (el.tagName === 'INPUT' && !INPUT_TYPES.has(el.type)) return null;
      const start = el.selectionStart, end = el.selectionEnd;
      if (start == null || start === end) return null;
      const text = el.value.slice(start, end);
      if (!text.trim()) return null;
      return { kind: 'input', el, start, end, text, at: e ? pagePoint(e) : pageRect(el.getBoundingClientRect()) };
    }
    const sel = getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    const text = sel.toString();
    if (!text.trim()) return null;
    const range = sel.getRangeAt(0).cloneRange();
    const node = range.commonAncestorContainer;
    const elem = node.nodeType === 1 ? node : node.parentElement;
    const editable = elem && elem.isContentEditable ? elem.closest('[contenteditable]') || elem : null;
    return { kind: editable ? 'editable' : 'page', range, root: editable, text, at: e ? pagePoint(e) : pageRect(range.getBoundingClientRect()) };
  }

  // Page coordinates of the selection, read fresh for ranges (the page may have scrolled or reflowed).
  function where(c) {
    const r = c.range && c.range.getBoundingClientRect();
    return r && (r.width || r.height) ? pageRect(r) : c.at;
  }

  function place(el, r, prefer) {
    const w = el.offsetWidth, ht = el.offsetHeight;
    const left = Math.max(scrollX + 8, Math.min(r.left, scrollX + document.documentElement.clientWidth - w - 8));
    const above = r.top - ht - 8, below = r.bottom + 8;
    const fitsAbove = above >= scrollY + 8, fitsBelow = below + ht <= scrollY + innerHeight - 8;
    const top = prefer === 'above' ? (fitsAbove ? above : below) : (fitsBelow || !fitsAbove ? below : above);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function attach() { if (!host.isConnected) document.documentElement.append(host); }

  function setMenu(open) {
    menu.hidden = !open;
    editBtn.setAttribute('aria-expanded', String(open));
  }

  function hide() {
    gen++;
    ctx = null;
    toolbar.hidden = card.hidden = true;
    setMenu(false);
  }

  function showToolbar(c) {
    attach();
    gen++;
    ctx = c;
    card.hidden = true;
    setMenu(false);
    toolbar.hidden = false;
    place(toolbar, where(c), 'above');
  }

  function showCard(c, { heading, note, loading, text, diff, retry }) {
    attach();
    result = text || '';
    title.textContent = heading;
    body.className = note ? 'body muted' : 'body';
    if (loading) body.replaceChildren(h('div', { class: 'sk-wrap' }, h('div', { class: 'sk sk1' }), h('div', { class: 'sk sk2' }), h('div', { class: 'sk sk3' })));
    else if (note) body.replaceChildren(note);
    else if (diff) body.replaceChildren(...diffWords(c.text, text).map(p => p.changed ? h('mark', {}, p.text) : p.text));
    else body.replaceChildren(text);
    replaceBtn.hidden = !text || c.kind === 'page';
    copyBtn.hidden = refreshBtn.hidden = !text;
    retryBtn.hidden = settingsBtn.hidden = !retry;
    foot.hidden = !text && !retry;
    card.hidden = false;
    place(card, where(c), 'below');
  }

  async function send(msg) {
    try { return await chrome.runtime.sendMessage(msg); } catch { return null; } // the extension was reloaded under this page
  }

  async function run(action) {
    const c = ctx;
    if (!c) return;
    if (action === 'editor') { send({ type: 'editor', text: c.text }); hide(); return; }
    const my = ++gen;
    lastAction = action;
    toolbar.hidden = true;
    setMenu(false);
    if (action === 'translate' && isMostlyRussian(c.text)) return showCard(c, { heading: 'Перевод не нужен', note: 'Текст уже на русском языке.' });
    showCard(c, { heading: ACTIONS[action].busy, loading: true });
    const res = await send({ type: 'run', action, text: c.text });
    if (my !== gen) return;
    if (!res || res.error) {
      return showCard(c, { heading: 'Не получилось', note: res ? res.error : 'Расширение было обновлено. Обнови страницу и попробуй ещё раз.', retry: true });
    }
    if (action === 'fix' && norm(res.text) === norm(c.text)) return showCard(c, { heading: 'Ошибок не найдено', note: 'Текст можно оставить как есть.' });
    showCard(c, { heading: ACTIONS[action].title, text: res.text, diff: action === 'fix' });
  }

  // Rich editors (ProseMirror, Slate, Draft) take a paste event; plain ones get execCommand, which keeps Ctrl+Z.
  function pasteText(el, text) {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    if (text.includes('\n')) {
      const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      dt.setData('text/html', esc.replace(/\n/g, '<br>'));
    }
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true, composed: true });
    el.dispatchEvent(ev);
    return ev.defaultPrevented || document.execCommand('insertText', false, text);
  }

  function replace() {
    const c = ctx, text = result;
    if (!c || !text) return;
    if (c.kind === 'input' && c.el.isConnected) {
      c.el.focus({ preventScroll: true });
      c.el.setSelectionRange(c.start, c.end);
      if (!document.execCommand('insertText', false, text)) {
        c.el.setRangeText(text, c.start, c.end, 'end');
        c.el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (c.kind === 'editable' && c.root.isConnected) {
      c.root.focus({ preventScroll: true });
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(c.range);
      if (!pasteText(c.root, text)) {
        c.range.deleteContents();
        c.range.insertNode(document.createTextNode(text));
      }
    }
    hide();
  }

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch { // no clipboard API (http page, no focus): the old way, then give the focus back
      const prev = document.activeElement, t = h('textarea', { class: 'clip' });
      t.value = text;
      root.append(t);
      t.focus();
      t.select();
      document.execCommand('copy');
      t.remove();
      if (prev && prev.focus) prev.focus({ preventScroll: true });
    }
    btn.replaceChildren(icon('check'));
    setTimeout(() => btn.replaceChildren(icon('copy')), 1200);
  }

  function search() {
    open('https://yandex.ru/search/?text=' + encodeURIComponent(ctx.text.trim().slice(0, 500)), '_blank', 'noopener');
    hide();
  }

  document.addEventListener('mousedown', e => {
    if (ctx && !e.composedPath().includes(host)) hide();
  }, true);

  document.addEventListener('mouseup', e => {
    if (e.button !== 0 || e.composedPath().includes(host)) return;
    setTimeout(() => { const c = capture(e); if (c) showToolbar(c); }); // after the browser has finished the selection
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!toolbar.hidden || !card.hidden) { e.preventDefault(); e.stopPropagation(); hide(); }
      return;
    }
    const action = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && KEYS[e.code];
    if (!action) return;
    const c = capture(null) || ctx;
    if (!c) return;
    e.preventDefault();
    e.stopPropagation();
    ctx = c;
    run(action);
  }, true);

  // shortcut: the toolbar hides on scroll instead of following the text; the card stays (it sits in page coordinates)
  addEventListener('scroll', () => { toolbar.hidden = true; setMenu(false); }, true);
})();
