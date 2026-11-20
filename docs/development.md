# Development

## Install (unpacked)
1. Open `chrome://extensions` (`edge://extensions`, `browser://extensions` in Yandex Browser).
2. Turn on Developer mode, press Load unpacked («Загрузить распакованное») and pick this folder.
3. The settings page opens on first install: paste the API key and press «Сохранить». The model list then loads from the server, which also confirms the key.
4. After editing files press the reload icon on the extension's card and reload open pages. A page opened before the reload keeps the old content script; its requests then fail with «Расширение было обновлено…».

## Tests
- `node --test`: unit tests of `shared.js` (word diff, language check). Run before every commit.
- `PRAVKA_KEY=… node scripts/smoke.js`: real requests through `api.js`: the model list, the four actions, a wrong key. `PRAVKA_MODEL=<id>` tries another model.
- `PRAVKA_KEY=… node scripts/e2e.js`: loads this folder into headless Chromium over CDP (`Extensions.loadUnpacked`, which needs `--remote-debugging-pipe` and `--enable-unsafe-extension-debugging`), serves a test page on a fake host through CDP Fetch and drives it with trusted mouse and key events. Covers: textarea fix + diff + replace, page-text translate without «Заменить текст», Esc, contenteditable menu + replace, Alt+T on Russian text (no request), a password field ignored, no click leaks to the page, no page errors. The default browser path is Chrome's; on the author's PC only Edge is installed: `CHROME="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`. The harness follows textexpander's `tests/real.js`.

## Not covered by the scripts (check by hand when touching these)
- Rich editors on real sites (Gmail, Telegram Web, VK). Google Docs draws text on a canvas and is not supported.
- The settings popup and the editor tab.
- Pages inside iframes, very long selections.

## Conventions
- No build step and no dependencies. Plain scripts share globals: `shared.js` is listed before `content.js` in the manifest and loaded by the extension pages; `api.js` is `importScripts`-ed by the worker. Files that node also loads end with `if (typeof module === 'object') module.exports = …`.
- The prompts live in `api.js` (`PROMPTS` + `RULES`); after changing them run `scripts/smoke.js`.
- `shortcut:` comments mark known limits.
