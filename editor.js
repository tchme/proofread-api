// The editor tab: the text from «Открыть в редакторе» on the left, the answer on the right.
const $ = id => document.getElementById(id);
const src = $('src'), out = $('out');
let gen = 0;
document.querySelectorAll('[data-icon]').forEach(el => el.prepend(icon(el.dataset.icon)));

chrome.storage.session.get('editorText').then(({ editorText }) => {
  if (editorText) { src.value = editorText; chrome.storage.session.remove('editorText'); }
  src.focus();
});

function show(heading, nodes, muted = false) {
  $('out-title').textContent = heading;
  out.className = muted ? 'ed-out muted' : 'ed-out';
  out.replaceChildren(...nodes);
}

const mark = text => Object.assign(document.createElement('mark'), { textContent: text });

document.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', async () => {
  const action = btn.dataset.act, text = src.value, my = ++gen;
  if (!text.trim()) return show('Результат', ['Сначала вставь текст слева.'], true);
  if (action === 'translate' && isMostlyRussian(text)) return show('Перевод не нужен', ['Текст уже на русском языке.'], true);
  show(ACTIONS[action].busy, [], true);
  const res = await chrome.runtime.sendMessage({ type: 'run', action, text }).catch(e => ({ error: e.message }));
  if (my !== gen) return;
  if (!res || res.error) return show('Не получилось', [res ? res.error : 'Нет ответа от расширения.'], true);
  if (action === 'fix' && norm(res.text) === norm(text)) return show('Ошибок не найдено', ['Текст можно оставить как есть.'], true);
  show(ACTIONS[action].title, action === 'fix' ? diffWords(text, res.text).map(p => p.changed ? mark(p.text) : p.text) : [res.text]);
}));

$('copy').addEventListener('click', async () => {
  const label = $('copy').lastChild;
  await navigator.clipboard.writeText(out.textContent);
  label.textContent = 'Скопировано';
  setTimeout(() => { label.textContent = 'Копировать'; }, 1200);
});
