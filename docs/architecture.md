# Architecture

| File | Role |
|---|---|
| `manifest.json` | MV3; content scripts on all URLs and frames; host permission `<all_urls>` because the API address is user-set |
| `icons/` | `icon.svg` is the source (pink #d6336c tile, white check, underline); `icon16/32/48/128.png` are rendered from it with headless Edge: `msedge --headless=new --default-background-color=00000000 --window-size=N,N --screenshot=iconN.png <html with the svg at N px>` |
| `shared.js` | `ACTIONS` titles, `ICONS` + `icon()`, `norm`, `diffWords` (word LCS), `isMostlyRussian`; used by the content script, both pages and the tests |
| `api.js` | `DEFAULTS` (tooken.club, `gpt-6-luna`), `PROMPTS` + `RULES`, `complete()` → `POST /chat/completions`, `listModels()` → `GET /models` filtered to models with the `chat` endpoint |
| `background.js` | service worker: message router (`run`, `editor`, `settings`); opens the settings on first install |
| `content.js` | selection capture, toolbar, menu, result card, hotkeys, replace, copy, search |
| `options.html` / `options.js` | the toolbar popup and the options page: address, key, model select (from the server) or a custom name |
| `editor.html` / `editor.js` | the editor tab; the text arrives through `chrome.storage.session` |
| `page.css` | styles of both extension pages (system theme) |

## Flow
`mouseup` → `capture()` → toolbar. A menu item or an Alt key → `run(action)` → `chrome.runtime.sendMessage({ type: 'run' })` → `background.js` → `complete()` → the card. A `gen` counter drops a late answer once the selection changed or the card was closed.

## Selection kinds
- `input`: a textarea or a text-like input. Replace = `execCommand('insertText')` over the saved range (keeps Ctrl+Z); fallback `setRangeText` + an `input` event.
- `editable`: a contenteditable. Replace = a synthetic `paste` event (rich editors take it), then `execCommand('insertText')`, then a raw range insert.
- `page`: plain page text. The card offers only copying.

## Card states
Loading (skeleton); result (diff marks only for «Исправить ошибки»; buttons «Заменить текст», «Обновить» = the same action again, «Копировать»); «Ошибок не найдено» (the answer equals the input up to whitespace); «Перевод не нужен» (`isMostlyRussian`, no request); error (the server's message, «Повторить», «Настройки»).
