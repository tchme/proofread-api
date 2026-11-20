const test = require('node:test');
const assert = require('node:assert');
const { diffWords, isMostlyRussian, norm } = require('../shared.js');

test('diffWords marks changed words and keeps the rest', () => {
  assert.deepStrictEqual(
    diffWords('пажалуста пришлите отчет до пятницы я', 'Пожалуйста, пришлите отчет до пятницы, я'),
    [
      { text: 'Пожалуйста,', changed: true },
      { text: ' пришлите отчет до ', changed: false },
      { text: 'пятницы,', changed: true },
      { text: ' я', changed: false },
    ]);
});

test('diffWords segments join back into the corrected text exactly', () => {
  const after = 'Короче,  я посмотрел\nмакет: в целом всё норм.';
  assert.strictEqual(diffWords('Короче я посмотрел макет в целом всё норм', after).map(p => p.text).join(''), after);
});

test('diffWords on equal or empty texts marks nothing', () => {
  assert.deepStrictEqual(diffWords('всё верно', 'всё верно'), [{ text: 'всё верно', changed: false }]);
  assert.deepStrictEqual(diffWords('что-то', ''), []);
  assert.deepStrictEqual(diffWords('', 'новое'), [{ text: 'новое', changed: true }]);
});

test('diffWords gives up highlighting on huge texts instead of hanging', () => {
  const big = Array(2100).fill('слово').join(' ');
  const t = Date.now();
  assert.deepStrictEqual(diffWords(big, big + ' ещё'), [{ text: big + ' ещё', changed: false }]);
  assert.ok(Date.now() - t < 500);
});

test('isMostlyRussian', () => {
  assert.ok(isMostlyRussian('Привет, мир'));
  assert.ok(isMostlyRussian('Открой Chrome и Edge, там всё есть'));
  assert.ok(isMostlyRussian('12345 !!!'), 'no letters: nothing to translate');
  assert.ok(!isMostlyRussian('The release has been moved to Thursday'));
  assert.ok(!isMostlyRussian('Привіт, як справи? Це українська мова'), 'Ukrainian is translated');
});

test('norm squeezes whitespace', () => {
  assert.strictEqual(norm('  a \n\t b  '), 'a b');
});
