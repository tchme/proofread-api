// Shared by content.js, editor.js, options.js and the node tests: action titles, icons, word diff, language check.

const ACTIONS = {
  fix: { title: 'Ошибки исправлены', busy: 'Исправляю ошибки…' },
  rephrase: { title: 'Другими словами', busy: 'Перефразирую…' },
  style: { title: 'Стиль улучшен', busy: 'Улучшаю стиль…' },
  translate: { title: 'Перевод на русский', busy: 'Перевожу…' },
};

// 24x24 stroke icons as path data (no innerHTML: some sites enforce Trusted Types).
const ICONS = {
  edit: ['M4 20l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L8 19z', 'M13.5 7.5l3 3', 'M20 14v4M18 16h4'],
  fix: ['M8.5 6.4c.9-.6 1.9-.9 3-.9 2.3 0 3.5 1.2 3.5 3.4V15', 'M15 10.8c-4.3 0-7 .9-7 2.7 0 1.2 1 1.9 2.5 1.9 2.4 0 4.5-1.5 4.5-3.6', 'M4 19.5c1.3-1 2.7-1 4 0s2.7 1 4 0 2.7-1 4 0 2.7 1 4 0'],
  rephrase: ['M4.5 11a7.5 7.5 0 0 1 13-4.2L19.5 9', 'M19.5 4v5h-5', 'M19.5 13a7.5 7.5 0 0 1-13 4.2L4.5 15', 'M4.5 20v-5h5'],
  style: ['M11 3.5l1.7 4.6 4.8 1.6-4.8 1.6L11 16l-1.7-4.7-4.8-1.6 4.8-1.6z', 'M18.5 14.5l.8 2.1 2.2.8-2.2.8-.8 2.3-.8-2.3-2.2-.8 2.2-.8z'],
  open: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  translate: ['M3.5 5.5h10M8.5 3.5v2', 'M11.5 5.5c-1 4-3.6 7-7.5 9', 'M6.5 8.5c1.3 2.3 3.1 4 5.2 5', 'M12.5 20.5l4-9 4 9M14 17.5h5'],
  search: ['M17.5 11a6.5 6.5 0 1 1-13 0a6.5 6.5 0 1 1 13 0z', 'M20 20l-4.2-4.2'],
  copy: ['M10.5 8.5h7.5a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-7.5a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2z', 'M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5'],
  close: ['M6.5 6.5l11 11M17.5 6.5l-11 11'],
  panel: ['M6 5h12a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-9A2.5 2.5 0 0 1 6 5z', 'M14.5 5v14'],
  return: ['M19.5 5.5v5.5a3 3 0 0 1-3 3H5', 'M9 10l-4 4 4 4'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
};
ICONS.refresh = ICONS.rephrase; // the card's «Обновить» shows the same turning arrows

function icon(name) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'i');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ICONS[name]) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

const norm = s => s.replace(/\s+/g, ' ').trim();

// Marks the words of `after` that are outside the longest common word sequence with `before`.
// The segments join back into `after` exactly; whitespace is never marked.
function diffWords(before, after) {
  const isSpace = s => /^\s+$/.test(s);
  const a = before.split(/\s+/).filter(Boolean);
  const parts = after.split(/(\s+)/).filter(Boolean);
  const b = parts.filter(p => !isSpace(p));
  const n = a.length, m = b.length;
  // shortcut: no highlight when both sides pass ~2000 words (the table would exceed 4M cells); a selection popup never gets there
  if (n * m > 4e6) return [{ text: after, changed: false }];
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Array(m).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { keep[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const out = [];
  let k = 0;
  for (const p of parts) {
    const changed = isSpace(p) ? false : !keep[k++];
    const last = out[out.length - 1];
    if (last && last.changed === changed) last.text += p;
    else out.push({ text: p, changed });
  }
  return out;
}

// True when at least half of the letters are Cyrillic and none is Ukrainian or Belarusian only.
// Text without letters counts as Russian: there is nothing to translate.
function isMostlyRussian(text) {
  if (/[іїєґўІЇЄҐЎ]/.test(text)) return false;
  const letters = text.match(/\p{L}/gu) || [];
  const cyr = letters.filter(c => /\p{Script=Cyrillic}/u.test(c)).length;
  return cyr * 2 >= letters.length;
}

if (typeof module === 'object') module.exports = { ACTIONS, ICONS, norm, diffWords, isMostlyRussian };
