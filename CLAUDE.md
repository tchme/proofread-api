# Правка (pravka)

A Chromium MV3 extension (Chrome, Edge, Brave, Opera, Yandex Browser) that copies Yandex Browser's selection toolbar without its logos: select text → «Редактировать» (fix errors and punctuation, rephrase, improve style, open in the editor) and «Перевести» (to Russian). Answers come from any OpenAI-compatible chat API; the default is tooken.club with the model `gpt-6-luna`. UI strings are Russian; code, comments, docs and commit messages are English.

## Commands
- Unit tests: `node --test` (no dependencies)
- Live API check: `PRAVKA_KEY=… node scripts/smoke.js` (~1000 tokens)
- Browser end-to-end: `PRAVKA_KEY=… CHROME=<chromium exe> node scripts/e2e.js` (~800 tokens; `PRAVKA_SHOTS=<dir>` saves screenshots)
- Install and reload: docs/development.md

## Key rules
- Only `background.js` (through `api.js`) talks to the API: a content script's fetch is bound by the page's CORS.
- Content-script DOM is built with `createElement` (Trusted Types sites), styled by a constructable stylesheet inside a closed shadow root; our events are stopped at the shadow root.
- Never read password or other non-text inputs (docs/bugs.md).
- Hotkeys match `e.code`, so they work in the Russian layout.
- Never commit an API key; the scripts read it from `PRAVKA_KEY`.

## Docs
- [docs/development.md](docs/development.md) — install, run, test, manual checks, conventions
- [docs/architecture.md](docs/architecture.md) — files, message flow, selection kinds, card states
- [docs/decisions.md](docs/decisions.md) — why this API and model (measurements), what was rejected, UI choices
- [docs/bugs.md](docs/bugs.md) — verified pitfalls and fixed bugs
