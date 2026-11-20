# Proofread API (proofread-api)

Called «Правка» (folder `pravka`) before 0.2.0. A Chromium MV3 extension (Chrome, Edge, Brave, Opera, Yandex Browser) that copies Yandex Browser's selection toolbar without its logos: select text → «Редактировать» (fix errors and punctuation, rephrase, improve style, open in the editor) and «Перевести» (to Russian). Answers come from any OpenAI-compatible chat API; the default is tooken.club with the model `gpt-6-luna`. UI strings are Russian; code, comments, docs and commit messages are English.

## Commands
- Unit tests: `node --test` (no dependencies)
- Live API check: `PROOFREAD_KEY=… node scripts/smoke.js` (~1000 tokens)
- Model speed: `PROOFREAD_KEY=… node scripts/bench.js` (all chat models, one request at a time)
- Browser end-to-end: `PROOFREAD_KEY=… CHROME=<chromium exe> node scripts/e2e.js` (~800 tokens; `PROOFREAD_SHOTS=<dir>` saves screenshots)
- Release to `github.com/tchme/proofread-api` (private): `node scripts/release.js [--dry]` from `main` (docs/development.md "Release")
- Install and reload: docs/development.md, README.md

## Key rules
- Only `background.js` (through `api.js`) talks to the API: a content script's fetch is bound by the page's CORS.
- Content-script DOM is built with `createElement` (Trusted Types sites), styled by a constructable stylesheet inside a closed shadow root; our events are stopped at the shadow root.
- Never read password or other non-text inputs (docs/bugs.md).
- Hotkeys match `e.code`, so they work in the Russian layout.
- Never commit an API key; the scripts read it from `PROOFREAD_KEY`.

## Docs
- [docs/development.md](docs/development.md) — install, run, test, manual checks, conventions
- [docs/architecture.md](docs/architecture.md) — files, message flow, selection kinds, card states
- [docs/decisions.md](docs/decisions.md) — why this API and model (measurements), what was rejected, UI choices
- [docs/bugs.md](docs/bugs.md) — verified pitfalls and fixed bugs
