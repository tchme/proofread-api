// Settings: server address, key, model. The model list comes from the server and also proves the key works.
const $ = id => document.getElementById(id);
const OTHER = '__other';
document.querySelectorAll('[data-icon]').forEach(el => el.prepend(icon(el.dataset.icon)));

function status(text, bad = false) {
  $('status').textContent = text;
  $('status').className = bad ? 'status bad' : 'status';
}

function fillModels(ids, current) {
  const list = [...new Set([...ids, current])].filter(Boolean).sort();
  $('model').replaceChildren(...list.map(id => new Option(id, id)), new Option('Другая модель…', OTHER));
  $('model').value = current;
  $('custom').hidden = true;
}

async function loadModels(s) {
  if (!s.key) { $('note').textContent = 'Список моделей появится после сохранения ключа.'; return; }
  $('note').textContent = 'Загружаю список моделей…';
  try {
    const ids = await listModels(s);
    fillModels(ids, s.model);
    $('note').textContent = `Ключ принят, моделей для текста: ${ids.length}.`;
  } catch (e) {
    $('note').textContent = 'Список моделей не загрузился: ' + e.message;
  }
}

$('model').addEventListener('change', () => {
  $('custom').hidden = $('model').value !== OTHER;
  if (!$('custom').hidden) $('custom').focus();
});

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const model = $('model').value === OTHER ? $('custom').value.trim() : $('model').value;
  const s = { base: $('base').value.trim() || DEFAULTS.base, key: $('key').value.trim(), model: model || DEFAULTS.model };
  if (!/^https?:\/\/\S+$/.test(s.base)) return status('Адрес должен начинаться с https://', true);
  await chrome.storage.local.set(s);
  $('base').value = s.base;
  status('Сохранено.');
  await loadModels(s);
});

chrome.storage.local.get(['base', 'key', 'model']).then(stored => {
  const s = { ...DEFAULTS, ...stored };
  $('base').value = s.base;
  $('key').value = s.key;
  fillModels([], s.model);
  loadModels(s);
});
